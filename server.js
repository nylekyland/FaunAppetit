var fs = require('fs'), path = require ('path'), Twit = require('twit'),
config = require(path.join(__dirname, 'config.js')),
jimp = require('Jimp'),
gifEncoder = require('gifencoder');

var T = new Twit(config);

var mostRecentBotTweet = [];
var tweets = [{"text":"@NintendoAmerica talk", "favorite_count":9999999}];
var fontString = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !?:,"

var gameState = JSON.parse(fs.readFileSync('gameState.json', 'utf8'));

//Get most recent bot tweet to determine search results for tweets since then
T.get('search/tweets', {q: 'from:NintendoAmerica', count: 1, result_type: 'recent'}, function(err, data, response){
	if (data.statuses.length > 0){
		//A bot tweet was found, get all mentions since then
		mostRecentBotTweet = data.statuses[0];
		T.get('search/tweets', { q: 'to:NintendoAmerica', count: 100, since_id: mostRecentBotTweet.id }, function(err, data, response){
			for (var i = 0; i < data.statuses.length; i++){
				tweets.push(data.statuses[i]);
			}
			//Sort the tweets by number of favorites/retweets
			tweets = tweets.sort(function (a, b){
				var aCount = a.retweet_count + a.favorite_count;
				var bCount = b.retweet_count + b.favorite_count;
				if (aCount > bCount)
					return -1;
				if (aCount < bCount)
					return 1;
				return 0;
			});
			if (tweets.length > 0){
				for (var i = 0; i < tweets.length; i++){
					var handled = handleInput(tweets[i].text);
					if (handled){
						console.log(tweets[i].text);
						//console.log("Favorites: " + tweets[i].favorite_count);
						//console.log("Retweets: " + tweets[i].retweet_count);	
						break;
					}
				}
			}
			else{
				console.log("No replies found.");
			}
		});
	}
	else{
		//No recent bot tweet found, cannot proceed
		console.log("No recent tweet found.");
	}
});

function handleInput(string){
	var inputText = '';
	//Get the actual input text without the twitter stuff in it
	var parts = string.split("@NintendoAmerica ");
	if (parts && parts[1]){
		inputText = parts[1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_\'`~()]/g,"").replace(/\s{2,}/g," ");
		var commands = inputText.split(" ");
		//Parse the Commands
		//MOVEMENT
		var validCommands = [];
		if (gameState.currentState == "field"){
			validCommands = ['north', 'south', 'east', 'west', 'up', 'down', 'left', 'right', 'talk']
			//Scan tweet for first number that's between 1 and 9, inclusive. If not found, default movement to one square.
			var num = 1;
			var findNum = commands.find(function(element){
				return typeof element == "number" && element >= 1 && element <= 9;
			});
			if (findNum)
				num = findNum;
			for (var i = 0; i < commands.length; i++){
				if (validCommands.indexOf(commands[i]) > -1){
					switch(commands[i]){
						case "north":
						case "up":
							buildMovementImage("up", num);
						break;
						case "south":
						case "down":
							buildMovementImage("down", num);
						break;
						case "west":
						case "left":
							buildMovementImage("left", num);
						break;
						case "east":
						case "right":
							buildMovementImage("right", num);
						break;
						case "talk":
							var npcId = checkNextToNPC(gameState.player.direction);
							if (npcId)
								buildDialogImage(npcId);
						break;
					}
					console.log(commands[i]);
					return true;
				}
			}
		}	
	}
	return false;
}

function buildMovementImage(command, stepsNum){
	var encoder = new gifEncoder(400, 200);
	encoder.createReadStream().pipe(fs.createWriteStream("test.gif"))
	encoder.start();
	encoder.setRepeat(0);	//0 for repeat, -1 for no-repeat
	encoder.setDelay(75); 	//frame delay in ms
	encoder.setQuality(10);	//image quality, 10 is default
	var img = new jimp(400, 200, 0xFFFFFFFF, function(err, bg){
		if (err) throw err;
		console.log("bg done");
		jimp.read("assets/map.png", function(err, map){
			if (err) throw err;
			console.log("done with map image");
			var playerImage = jimp.read("assets/player.png", function(err, img){
				if (err) throw err;
				console.log("done with player image");
				
				var distance = 32 * stepsNum;
				var stepDistance = 4;
				var i = 0;
				
				while (i <= distance){
					var b = bg.clone();
					var p = img.clone();
					var m = map.clone();
					var x = 0;
					var y = 0;
					switch (command){
						case "left":
						if (checkCollisions(gameState.player.xPosition + i, gameState.player.yPosition, gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight))
							distance = i;
						x = i;
						break;
						case "right":
						if (checkCollisions(gameState.player.xPosition - i, gameState.player.yPosition, gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight))
							distance = i;
						x = -i;
						break;
						case "down":
						if (checkCollisions(gameState.player.xPosition, gameState.player.yPosition + i, gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight))
							distance = i;
						y = -i;
						case "up":
						if (checkCollisions(gameState.player.xPosition, gameState.player.yPosition - i, gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight))
							distance = i;
						y = i;
						break;
					}
					
					if (i == distance){
						encoder.setDelay(1500);
						gameState.playerSprite.currentFrame = 0;
					}
					else if (i == 0){
						encoder.setDelay(200);
						gameState.playerSprite.currentFrame = 0;
					}
					else{
						encoder.setDelay(75);
					}
					var pFrame = p.clone().crop(gameState.playerSprite.currentFrame * gameState.playerSprite.spriteWidth, gameState.playerSprite.currentAnimation * gameState.playerSprite.spriteHeight, gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight);
					b.composite(m.clone(), gameState.mapPosition.xPosition + x, gameState.mapPosition.yPosition + y);
					b.composite(pFrame.clone(), 192, 96);
					encoder.addFrame(b.bitmap.data);
					gameState.playerSprite.currentFrame++;
					if (gameState.playerSprite.currentFrame > 1)
						gameState.playerSprite.currentFrame = 0;
					i += stepDistance;
				}
				console.log("done with gif");
				encoder.finish();
				
				//Update and Save the JSON
				switch(command){
					case "left":
						gameState.player.direction = "left";
						gameState.player.xPosition -= distance;
						gameState.mapPosition.xPosition += distance;
						break;
					case "right":
						gameState.player.direction = "right";
						gameState.player.xPosition += distance;
						gameState.mapPosition.xPosition -= distance;
						break;
					case "up":
						gameState.player.direction = "up";
						gameState.player.yPosition -= distance;
						gameState.mapPosition.yPosition += distance;
						break;
					case "down":
						gameState.player.direction = "down";
						gameState.player.yPosition += distance;
						gameState.mapPosition.yPosition -= distance;
						break;
				}
				var json = JSON.stringify(gameState);
				fs.writeFile('gameState.json', json, 'utf8', function(err){
					if (err) throw err;
				});
			});
		});
	});
}

function buildDialogImage(npcId){
	var encoder = new gifEncoder(400, 200);
	encoder.createReadStream().pipe(fs.createWriteStream("test.gif"))
	encoder.start();
	encoder.setRepeat(0);	//0 for repeat, -1 for no-repeat
	encoder.setDelay(75); 	//frame delay in ms
	encoder.setQuality(10);	//image quality, 10 is default
	var img = new jimp(400, 200, 0xFFFFFFFF, function(err, bg){
		if (err) throw err;
		console.log("bg done");
		jimp.read("assets/map.png", function(err, map){
			if (err) throw err;
			console.log("done with map image");
			var playerImage = jimp.read("assets/player.png", function(err, player){
				if (err) throw err;
				console.log("done with player image");
				var dialogBox = new jimp(250, 42, 0xEFEFEFFF, function(err, db){
					if (err) throw err;
					console.log("done with dialog box");
					var font = jimp.read("assets/font.png", function(err, font){
						if (err) throw err;
						//Find the NPC dialog based on the ID		
						var npc = gameState.npcs.findIndex(function(element){
							return element.id == npcId
						});
						if (npc != null){
							var text = gameState.npcs[npc].dialog.toUpperCase();
							var buffer = "", bufferLineOne = "", bufferLineTwo = "";
							var currentLine = 0, characterCount = 0;
							var len = 15;
							var lines = splitter(text, 15);
							//Start the main loop of the gif, printing words onscreen letter by letter
							while (currentLine < lines.length){
								var b = bg.clone();
								var p = player.clone();
								var m = map.clone();
								var d = db.clone();
								var f = font.clone();
								
								if (currentLine == lines.length - 1 && characterCount == lines[currentLine].length){
									encoder.setDelay(1500);
								}
								else if (buffer.length == 0){
									encoder.setDelay(200);
								}
								else{
									encoder.setDelay(75);
								}
								
								var pFrame = p.clone().crop(gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight, gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight);
								b.composite(m.clone(), gameState.mapPosition.xPosition, gameState.mapPosition.yPosition);
								b.composite(pFrame.clone(), 192, 96);
								if (buffer.length != 0){
									b.composite(d.clone(), 75, 158);
									if (currentLine == 0){
										//line one
										for (var i = 0; i < lines[currentLine].length; i++){
											b.composite(f.clone().crop(fontString.indexOf(bufferLineOne[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 158);	
										}	
									}
									else{
										//line one
										for (var i = 0; i < lines[currentLine - 1].length; i++){
											b.composite(f.clone().crop(fontString.indexOf(bufferLineOne[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 158);	
										}
										//line two
										for (var i = 0; i < lines[currentLine].length; i++){
											b.composite(f.clone().crop(fontString.indexOf(bufferLineTwo[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 174);	
										}										
									}
								}
								encoder.addFrame(b.bitmap.data);
								buffer += lines[currentLine][characterCount] || ' ';
								if (currentLine == 0)
									bufferLineOne += lines[currentLine][characterCount] || ' ';
								else{
									bufferLineTwo += lines[currentLine][characterCount] || ' ';
								}
								characterCount++;
								if (characterCount > lines[currentLine].length){
									characterCount = 0;
									currentLine++;
									if (currentLine > 1)
									{
										bufferLineOne = bufferLineTwo;
										bufferLineTwo = "";
									}
								}
							}
						}
						console.log("done with gif");
						encoder.finish();
					});
				});
			});
		});
	});
}

function checkCollisions(x, y, width, height){
	for (var i = 0; i < gameState.objects.length; i++){
		if (x < gameState.objects[i].x + gameState.objects[i].width &&
		x + width > gameState.objects[i].x &&
		y < gameState.objects[i].y + gameState.objects[i].height &&
		y + height > gameState.objects[i].y)
		{
			return true;
		}
	}
	return false;
}

function checkNextToNPC(direction){
	switch (direction){
		case "left":
			for (var i = 0; i < gameState.npcs.length; i++){
				if (gameState.npcs[i].x + gameState.npcs[i].width == gameState.player.xPosition)
					return gameState.npcs[i].id;
			}
			break;
		case "right":
			for (var i = 0; i < gameState.npcs.length; i++){
				if (gameState.player.xPosition + gameState.player.width == gameState.npcs[i].x)
					return gameState.npcs[i].id;
			}
			break;
		case "up":
			for (var i = 0; i < gameState.npcs.length; i++){
				if (gameState.npcs[i].y + gameState.npcs[i].height == gameState.player.yPosition)
					return gameState.npcs[i].id;
			}
			break;
		case "down":
			for (var i = 0; i < gameState.npcs.length; i++){
				if (gameState.player.yPosition + gameState.player.height == gameState.npcs[i].y)
					return gameState.npcs[i].id;
			}
	}
	return 0;
}

function splitter(str, l){
    var strs = [];
    while(str.length > l){
        var pos = str.substring(0, l).lastIndexOf(' ');
        pos = pos <= 0 ? l : pos;
        strs.push(str.substring(0, pos));
        var i = str.indexOf(' ', pos)+1;
        if(i < pos || i > pos+l)
            i = pos;
        str = str.substring(i);
    }
    strs.push(str);
    return strs;
}
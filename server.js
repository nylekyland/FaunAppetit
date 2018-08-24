var fs = require('fs'), path = require ('path'), Twit = require('twit'),
config = require(path.join(__dirname, 'config.js')),
jimp = require('Jimp'),
gifEncoder = require('gifencoder');

var T = new Twit(config);

var mostRecentBotTweet = [];
var tweets = [{"text":"@NintendoAmerica tackle", "favorite_count":9999999}];
var fontString = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !?:,"

var gameState = JSON.parse(fs.readFileSync('gameState.json', 'utf8'));

//Get most recent bot tweet to determine search results for tweets since then
T.get('search/tweets', {q: 'from:NintendoAmerica', count: 1, result_type: 'recent'}, function(err, data, response){
	if (data.statuses.length > 0){
		//A bot tweet was found, get all mentions since then
		mostRecentBotTweet = data.statuses[0];
		T.get('search/tweets', { q: 'to:NintendoAmerica', count: 10, since_id: mostRecentBotTweet.id }, function(err, data, response){
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
            if (tweets.length > 0) {
                console.log("tweets found");
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
            validCommands = ['north', 'south', 'east', 'west', 'up', 'down', 'left', 'right', 'talk'];
			//Scan tweet for first number that's between 1 and 9, inclusive. If not found, default movement to one square.
			var num = 1;
			var findNum = commands.find(function(element){
				return parseInt(element) >= 1 && parseInt(element) <= 9;
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
        else if (gameState.currentState == "battle") {
            validCommands = ['fight', 'item', 'monsters', 'run'];
            var attackCommands = [];
            for (var i = 0; i < gameState.currentParty[0].moves.length; i++) {
                attackCommands.push(gameState.currentParty[0].moves[i]);
            }
            for (var i = 0; i < commands.length; i++) {
                if (attackCommands.indexOf(commands[i]) > -1) {
                    buildAttackImage(commands[i]);
                }
                if (validCommands.indexOf(commands[i]) > -1) {
                    switch (commands[i]) {
                        case "fight":
                            buildAttackMenuImage();
                            break;
                        case "item":
                            buildItemMenuImage();
                            break;
                        case "monsters":
                            buildMonsterMenuImage();
                            break;
                        case "run":
                            buildRunImage();
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
	encoder.setDelay(50); 	//frame delay in ms
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
				var monsterFound = 0;
				
				while (i <= distance){
                    var b = bg.clone();
                    var white = bg.clone();
					var p = img.clone();
					var m = map.clone();
					var x = 0;
					var y = 0;
					switch (command){
						case "left":
						if (checkCollisions(gameState.player.xPosition - i, gameState.player.yPosition, gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight)){
							i = i - stepDistance;
							distance = i;	
						}
						x = i;
						break;
						case "right":
						if (checkCollisions(gameState.player.xPosition + i, gameState.player.yPosition, gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight)){
							i = i - stepDistance;
							distance = i;	
						}
						x = -i;
						break;
						case "down":
						if (checkCollisions(gameState.player.xPosition, gameState.player.yPosition + i, gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight)){
							i = i - stepDistance;
							distance = i;
						}
						y = -i;
						case "up":
						if (checkCollisions(gameState.player.xPosition, gameState.player.yPosition - i, gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight)){
							i = i - stepDistance;
							distance = i;	
						}
						y = i;
						break;
					}
					
					//Check if player is on a grass tile. If so, check random number for new wild encounter
					if (i % 32 == 0 && i > 0) {
						if (checkGrass(gameState.player.xPosition, gameState.player.yPosition, gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight)) {
							var randNum = Math.floor(Math.random() * 188);
							console.log("Random num: " + randNum);
							if (randNum <= 8 && gameState.currentMap.monsters.rare != null && gameState.currentMap.monsters.rare.length > 0) {
								console.log("rare monster found");
								distance = i;
                                monsterFound = gameState.currentMap.monsters.rare[Math.floor(Math.random() * gameState.currentMap.monsters.rare.length)].id;
							}
							if (randNum > 8 && randNum <= 20 && gameState.currentMap.monsters.uncommon != null && gameState.currentMap.monsters.uncommon.length > 0) {
								console.log("uncommon monster found");
								distance = i;
                                monsterFound = gameState.currentMap.monsters.uncommon[Math.floor(Math.random() * gameState.currentMap.monsters.uncommon.length)].id;
							}
							if (randNum > 20 && randNum <= 40 && gameState.currentMap.monsters.common != null && gameState.currentMap.monsters.common.length > 0) {
								console.log("common monster found");
								distance = i;
                                monsterFound = gameState.currentMap.monsters.common[Math.floor(Math.random() * gameState.currentMap.monsters.common.length)].id;
							}
						}
					}
					
					if (i == distance && monsterFound == 0){
						encoder.setDelay(1500);
						gameState.playerSprite.currentFrame = 0;
					}
					else if (i == 0){
						encoder.setDelay(200);
						gameState.playerSprite.currentFrame = 0;
					}
					else{
						encoder.setDelay(50);
					}
					var pFrame = p.clone().crop(gameState.playerSprite.currentFrame * gameState.playerSprite.spriteWidth, gameState.playerSprite.currentAnimation * gameState.playerSprite.spriteHeight, gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight);
					b.composite(m.clone(), gameState.mapPosition.xPosition + x + gameState.mapPosition.offsetX, gameState.mapPosition.yPosition + y + gameState.mapPosition.offsetY);
                    b.composite(pFrame.clone(), gameState.player.offsetX, gameState.player.offsetY);
                    b.composite(white.clone().crop(0, 0, 75, 200), 0, 0);
                    b.composite(white.clone().crop(0, 0, 75, 200), 325, 0);
					encoder.addFrame(b.bitmap.data);
					gameState.playerSprite.currentFrame++;
					if (gameState.playerSprite.currentFrame > 1)
						gameState.playerSprite.currentFrame = 0;
					i += stepDistance;
                }

                if (monsterFound != 0) {
                    transitionMonster(b.clone(), white.clone(), pFrame.clone(), m.clone(), encoder, monsterFound, x, y, function () {
                        console.log("transitionMonster done");
                        startBattle(encoder, monsterFound, function () {
                            console.log("startBattle done");
                            console.log("done with gif");
                            encoder.finish();
                        });
                    });
                }
                else {
                    console.log("done with gif");
                    encoder.finish();
                }
				
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

function transitionMonster(b, white, p, m, encoder, monsterId, x, y, _callback){
	var img = new jimp(400, 25, 0x000000FF, function(err, btran){
		if (err) throw err;

        var pos1 = -400;
        var pos2 = 400;
        while (pos1 < 0 && pos2 > 0) {
            b.composite(m.clone(), gameState.mapPosition.xPosition + x + gameState.mapPosition.offsetX, gameState.mapPosition.yPosition + y + gameState.mapPosition.offsetY);
            b.composite(p.clone(), gameState.player.offsetX, gameState.player.offsetY);
            for (var i = 0; i < 4; i++) {
                b.composite(btran.clone(), pos1, i * 50);
                b.composite(btran.clone(), pos2, (i * 50) + 25);
                b.composite(white.clone().crop(0, 0, 75, 200), 0, 0);
                b.composite(white.clone().crop(0, 0, 75, 200), 325, 0);
            }
            encoder.addFrame(b.bitmap.data);
            if (pos1 < 0)
                pos1 += 16;
            if (pos2 > 0)
                pos2 -= 16;
            if (pos1 == 0 && pos2 == 0)
            {
                encoder.setDelay(1500);
                for (var i = 0; i < 4; i++) {
                    b.composite(btran.clone(), pos1, i * 50);
                    b.composite(btran.clone(), pos2, (i * 50) + 25);
                }
                b.composite(white.clone().crop(0, 0, 75, 200), 0, 0);
                b.composite(white.clone().crop(0, 0, 75, 200), 325, 0);
                encoder.addFrame(b.bitmap.data);
                _callback();
            }
        }
    });
}

function startBattle(encoder, monsterId, _callback) {
    encoder.setDelay(50);
    var btl = new jimp(400, 200, 0xFFFFFFFF, function (err, wbg) {
        if (err) throw err;
        gameState.currentMonster = gameState.monsters.find(obj => {
            return obj.id == monsterId;
        });
        gameState.currentState = "battle";
        jimp.read("assets/monster_front.png", function (err, mon) {
            if (err) throw err;
            var monPos = 0;
            var monPos2 = 400;
            var done = false;

            while (!done) {
                var b = wbg.clone();
                var white = wbg.clone();
                var m = mon.clone();
                b.composite(m.clone(), monPos, 32);
                b.composite(white.clone().crop(0, 0, 75, 200), 0, 0);
                b.composite(white.clone().crop(0, 0, 75, 200), 325, 0);
                encoder.addFrame(b.bitmap.data);
                if (monPos < 280)
                    monPos += 8;
                //monster is in the right place, start the text
                if (monPos == 280) {
                    done = true;
                }
            }
            var dialogBox = new jimp(250, 42, 0xEFEFEFFF, function (err, db) {
                if (err) throw err;
                console.log("done with dialog box");
                var font = jimp.read("assets/font.png", function (err, font) {
                    if (err) throw err;
                    console.log("done with font");

                    var text = gameState.currentMonster.name.toUpperCase() + " WANTS TO FIGHT!";
                    var buffer = "", bufferLineOne = "", bufferLineTwo = "";
                    var currentLine = 0, characterCount = 0;
                    var len = 15;
                    var lines = splitter(text, 15);
                    while (currentLine < lines.length) {
                        b = wbg.clone();
                        m = mon.clone();
                        var d = db.clone();
                        var f = font.clone();

                        if (currentLine == lines.length - 1 && characterCount == lines[currentLine].length) {
                            encoder.setDelay(1500);
                        }
                        else if (buffer.length == 0) {
                            encoder.setDelay(200);
                        }
                        else {
                            encoder.setDelay(50);
                        }

                        b.composite(m.clone(), monPos, 32);
                        if (buffer.length != 0) {
                            b.composite(d.clone(), 75, 158);
                            if (currentLine == 0) {
                                //line one
                                for (var i = 0; i < lines[currentLine].length; i++) {
                                    b.composite(f.clone().crop(fontString.indexOf(bufferLineOne[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 163);
                                }
                            }
                            else {
                                //line one
                                for (var i = 0; i < lines[currentLine - 1].length; i++) {
                                    b.composite(f.clone().crop(fontString.indexOf(bufferLineOne[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 163);
                                }
                                //line two
                                for (var i = 0; i < lines[currentLine].length; i++) {
                                    b.composite(f.clone().crop(fontString.indexOf(bufferLineTwo[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 179);
                                }
                            }
                        }
                        b.composite(white.clone().crop(0, 0, 75, 200), 0, 0);
                        b.composite(white.clone().crop(0, 0, 75, 200), 325, 0);
                        encoder.addFrame(b.bitmap.data);
                        buffer += lines[currentLine][characterCount] || ' ';
                        if (currentLine == 0)
                            bufferLineOne += lines[currentLine][characterCount] || ' ';
                        else {
                            bufferLineTwo += lines[currentLine][characterCount] || ' ';
                        }
                        characterCount++;
                        if (characterCount > lines[currentLine].length) {
                            characterCount = 0;
                            currentLine++;
                            if (currentLine > 1) {
                                bufferLineOne = bufferLineTwo;
                                bufferLineTwo = "";
                            }
                        }
                    }
                    //Show battle options
                    encoder.setDelay(3000);

                    b = wbg.clone();
                    m = mon.clone();
                    var d = db.clone();
                    var f = font.clone();

                    b.composite(m.clone(), monPos, 32);
                    b.composite(d.clone(), 75, 158);
                    bufferLineOne = "FIGHT     ITEM ";
                    bufferLineTwo = "MONSTERS  RUN  ";

                    //line one
                    for (var i = 0; i < bufferLineOne.length; i++) {
                        b.composite(f.clone().crop(fontString.indexOf(bufferLineOne[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 163);
                    }
                    //line two
                    for (var i = 0; i < bufferLineTwo.length; i++) {
                        b.composite(f.clone().crop(fontString.indexOf(bufferLineTwo[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 179);
                    }

                    b.composite(white.clone().crop(0, 0, 75, 200), 0, 0);
                    b.composite(white.clone().crop(0, 0, 75, 200), 325, 0);
                    encoder.addFrame(b.bitmap.data);
                    _callback();
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
	encoder.setDelay(50); 	//frame delay in ms
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
									encoder.setDelay(50);
								}
								
								var pFrame = p.clone().crop(0, 0, gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight);
								b.composite(m.clone(), gameState.mapPosition.xPosition, gameState.mapPosition.yPosition);
								b.composite(pFrame.clone(), 192, 96);
								if (buffer.length != 0){
									b.composite(d.clone(), 75, 158);
									if (currentLine == 0){
										//line one
										for (var i = 0; i < lines[currentLine].length; i++){
											b.composite(f.clone().crop(fontString.indexOf(bufferLineOne[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 163);	
										}	
									}
									else{
										//line one
										for (var i = 0; i < lines[currentLine - 1].length; i++){
											b.composite(f.clone().crop(fontString.indexOf(bufferLineOne[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 163);	
										}
										//line two
										for (var i = 0; i < lines[currentLine].length; i++){
											b.composite(f.clone().crop(fontString.indexOf(bufferLineTwo[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 179);	
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

function buildAttackImage(attack) {
    if (gameState.currentMonster) {
        var encoder = new gifEncoder(400, 200);
        encoder.createReadStream().pipe(fs.createWriteStream("test.gif"))
        encoder.start();
        encoder.setRepeat(0);	//0 for repeat, -1 for no-repeat
        encoder.setDelay(200); 	//frame delay in ms
        encoder.setQuality(10);	//image quality, 10 is default
        //white background
        var btl = new jimp(400, 200, 0xFFFFFFFF, function (err, wbg) {
            if (err) throw err;
            //get monster sprite
            jimp.read("assets/monster_front.png", function (err, mon) {
                if (err) throw err;
                var b = wbg.clone();
                var white = wbg.clone();
                var m = mon.clone();
                var dialogBox = new jimp(250, 42, 0xEFEFEFFF, function (err, db) {
                    if (err) throw err;
                    console.log("done with dialog box");
                    var font = jimp.read("assets/font.png", function (err, font) {
                        if (err) throw err;
                        console.log("done with font");
                        var lifebar = new jimp(100, 10, 0x000000FF, function (err, lif){
                            if (err) throw err;
                            console.log("done with making lifebars");
                            //first frame
                            b.composite(m.clone(), 280, 32);
                            b.composite(lif.clone().resize((100 * (gameState.currentMonster.stats.tempHealth / gameState.currentMonster.stats.health)), 10), 85, 32);
                            b.composite(lif.clone().resize((100 * (gameState.currentParty[0].stats.tempHealth / gameState.currentParty[0].stats.health)), 10), 225, 138);
                            b.composite(white.clone().crop(0, 0, 75, 200), 0, 0);
                            b.composite(white.clone().crop(0, 0, 75, 200), 325, 0);
                            encoder.addFrame(b.bitmap.data);
                            encoder.setDelay(50);
                            //player has higher speed than enemy, player goes first
                            if (gameState.currentParty[0].stats.speed >= gameState.currentMonster.stats.speed) {

                            }
                            //enemy has higher speed than player, enemy goes first
                            else {
                                //pick a random move
                                var randMove = gameState.currentMonster.moves[Math.floor(Math.random() * gameState.currentMonster.moves.length)];
                                var text = "ENEMY " + gameState.currentMonster.name.toUpperCase() + " USED " + randMove.toUpperCase() + "!";

                                var buffer = "", bufferLineOne = "", bufferLineTwo = "";
                                var currentLine = 0, characterCount = 0;
                                var len = 15;
                                var lines = splitter(text, 15);
                                //say what attack the enemy is going to do
                                while (currentLine < lines.length) {
                                    b = wbg.clone();
                                    m = mon.clone();
                                    l = lif.clone();
                                    var d = db.clone();
                                    var f = font.clone();

                                    if (currentLine == lines.length - 1 && characterCount == lines[currentLine].length) {
                                        encoder.setDelay(500);
                                    }
                                    else {
                                        encoder.setDelay(50);
                                    }

                                    if (gameState.currentMonster.stats.tempHealth > 0)
                                        b.composite(l.clone().resize((100 * (gameState.currentMonster.stats.tempHealth / gameState.currentMonster.stats.health)), 10), 85, 32);
                                    if (gameState.currentParty[0].stats.tempHealth > 0) 
                                        b.composite(l.clone().resize((100 * (gameState.currentParty[0].stats.tempHealth / gameState.currentParty[0].stats.health)), 10), 225, 138);
                                    b.composite(m.clone(), 280, 32);
                                    if (buffer.length != 0) {
                                        b.composite(d.clone(), 75, 158);
                                        if (currentLine == 0) {
                                            //line one
                                            for (var i = 0; i < lines[currentLine].length; i++) {
                                                b.composite(f.clone().crop(fontString.indexOf(bufferLineOne[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 163);
                                            }
                                        }
                                        else {
                                            //line one
                                            for (var i = 0; i < lines[currentLine - 1].length; i++) {
                                                b.composite(f.clone().crop(fontString.indexOf(bufferLineOne[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 163);
                                            }
                                            //line two
                                            for (var i = 0; i < lines[currentLine].length; i++) {
                                                b.composite(f.clone().crop(fontString.indexOf(bufferLineTwo[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 179);
                                            }
                                        }
                                    }
                                    b.composite(white.clone().crop(0, 0, 75, 200), 0, 0);
                                    b.composite(white.clone().crop(0, 0, 75, 200), 325, 0);
                                    encoder.addFrame(b.bitmap.data);
                                    buffer += lines[currentLine][characterCount] || ' ';
                                    if (currentLine == 0)
                                        bufferLineOne += lines[currentLine][characterCount] || ' ';
                                    else {
                                        bufferLineTwo += lines[currentLine][characterCount] || ' ';
                                    }
                                    characterCount++;
                                    if (characterCount > lines[currentLine].length) {
                                        characterCount = 0;
                                        currentLine++;
                                        if (currentLine > 1) {
                                            bufferLineOne = bufferLineTwo;
                                            bufferLineTwo = "";
                                        }
                                    }
                                }
                                //do the enemy's attack animation
                                encoder.setDelay(50);
                                var doesDamage = false;
                                var type = "normal";
                                switch (randMove) {
                                    case "tackle":
                                        doesDamage = true;
                                        for (var i = 0; i < 5; i++) {
                                            var offset = 0;
                                            if (i == 1 || i == 3)
                                                offset = -5;
                                            else if (i == 2)
                                                offset = -10;

                                            b = wbg.clone();
                                            m = mon.clone();
                                            l = lif.clone();
                                            if (gameState.currentMonster.stats.tempHealth > 0)
                                                b.composite(l.clone().resize((100 * (gameState.currentMonster.stats.tempHealth / gameState.currentMonster.stats.health)), 10), 85, 32);
                                            if (gameState.currentParty[0].stats.tempHealth > 0)
                                                b.composite(l.clone().resize((100 * (gameState.currentParty[0].stats.tempHealth / gameState.currentParty[0].stats.health)), 10), 225, 138);
                                            b.composite(m.clone(), 280 + offset, 32);
                                            b.composite(white.clone().crop(0, 0, 75, 200), 0, 0);
                                            b.composite(white.clone().crop(0, 0, 75, 200), 325, 0);
                                            encoder.addFrame(b.bitmap.data);
                                        }
                                        break;
                                    case "string shot":
                                        break;
                                }
                                //animate the player's health bar going down
                                if (doesDamage) {
                                    var startingHealth = gameState.currentParty[0].stats.tempHealth;
                                    gameState.currentParty[0].stats.tempHealth -= gameState.currentMonster.stats.tempAttack;
                                    if (gameState.currentParty[0].stats.tempHealth <= 0)
                                        gameState.currentParty[0].stats.tempHealth = 0;
                                    var endHealth = gameState.currentParty[0].stats.tempHealth;
                                    var difference = (startingHealth - endHealth) / 10;
                                    for (var i = 1; i <= 10; i++) {
                                        b = wbg.clone();
                                        m = mon.clone();
                                        l = lif.clone();
                                        if (gameState.currentMonster.stats.tempHealth > 0)
                                            b.composite(l.clone().resize((100 * (gameState.currentMonster.stats.tempHealth / gameState.currentMonster.stats.health)), 10), 85, 32);
                                        if ((100 * ((startingHealth - (difference * i)) / gameState.currentParty[0].stats.health)) > 0)
                                            b.composite(l.clone().resize((100 * ((startingHealth - (difference * i)) / gameState.currentParty[0].stats.health)), 10), 225, 138);
                                        b.composite(m.clone(), 280 + offset, 32);
                                        b.composite(white.clone().crop(0, 0, 75, 200), 0, 0);
                                        b.composite(white.clone().crop(0, 0, 75, 200), 325, 0);
                                        encoder.addFrame(b.bitmap.data);
                                    }
                                }
                                //check if the player died
                                if (gameState.currentParty[0].stats.tempHealth <= 0) {
                                    gameState.currentParty[0].stats.tempHealth = 0;
                                    //say that the player fainted
                                    var text = gameState.currentParty[0].name.toUpperCase() + " FAINTED!";
                                    var buffer = "", bufferLineOne = "", bufferLineTwo = "";
                                    var currentLine = 0, characterCount = 0;
                                    var len = 15;
                                    var lines = splitter(text, 15);

                                    while (currentLine < lines.length) {
                                        b = wbg.clone();
                                        m = mon.clone();
                                        l = lif.clone();
                                        var d = db.clone();
                                        var f = font.clone();

                                        if (currentLine == lines.length - 1 && characterCount == lines[currentLine].length) {
                                            encoder.setDelay(500);
                                        }
                                        else {
                                            encoder.setDelay(50);
                                        }

                                        b.composite(m.clone(), 280, 32);
                                        if (buffer.length != 0) {
                                            b.composite(d.clone(), 75, 158);
                                            if (currentLine == 0) {
                                                //line one
                                                for (var i = 0; i < lines[currentLine].length; i++) {
                                                    b.composite(f.clone().crop(fontString.indexOf(bufferLineOne[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 163);
                                                }
                                            }
                                            else {
                                                //line one
                                                for (var i = 0; i < lines[currentLine - 1].length; i++) {
                                                    b.composite(f.clone().crop(fontString.indexOf(bufferLineOne[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 163);
                                                }
                                                //line two
                                                for (var i = 0; i < lines[currentLine].length; i++) {
                                                    b.composite(f.clone().crop(fontString.indexOf(bufferLineTwo[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 179);
                                                }
                                            }
                                        }
                                        if (gameState.currentMonster.stats.tempHealth > 0)
                                            b.composite(l.clone().resize((100 * (gameState.currentMonster.stats.tempHealth / gameState.currentMonster.stats.health)), 10), 85, 32);
                                        if (gameState.currentParty[0].stats.tempHealth > 0)
                                            b.composite(l.clone().resize((100 * (gameState.currentParty[0].stats.tempHealth / gameState.currentParty[0].stats.health)), 10), 225, 138);
                                        b.composite(white.clone().crop(0, 0, 75, 200), 0, 0);
                                        b.composite(white.clone().crop(0, 0, 75, 200), 325, 0);
                                        encoder.addFrame(b.bitmap.data);
                                        buffer += lines[currentLine][characterCount] || ' ';
                                        if (currentLine == 0)
                                            bufferLineOne += lines[currentLine][characterCount] || ' ';
                                        else {
                                            bufferLineTwo += lines[currentLine][characterCount] || ' ';
                                        }
                                        characterCount++;
                                        if (characterCount > lines[currentLine].length) {
                                            characterCount = 0;
                                            currentLine++;
                                            if (currentLine > 1) {
                                                bufferLineOne = bufferLineTwo;
                                                bufferLineTwo = "";
                                            }
                                        }
                                    }
                                }
                                //player has not died
                                else {
                                    //do the player's attack now
                                    var text = gameState.currentParty[0].name.toUpperCase() + " USED " + attack.toUpperCase() + "!";
                                    var buffer = "", bufferLineOne = "", bufferLineTwo = "";
                                    var currentLine = 0, characterCount = 0;
                                    var len = 15;
                                    var lines = splitter(text, 15);
                                    //say what attack the player is going to do
                                    while (currentLine < lines.length) {
                                        b = wbg.clone();
                                        m = mon.clone();
                                        l = lif.clone();
                                        var d = db.clone();
                                        var f = font.clone();

                                        if (currentLine == lines.length - 1 && characterCount == lines[currentLine].length) {
                                            encoder.setDelay(500);
                                        }
                                        else {
                                            encoder.setDelay(50);
                                        }

                                        b.composite(m.clone(), 280, 32);
                                        if (buffer.length != 0) {
                                            b.composite(d.clone(), 75, 158);
                                            if (currentLine == 0) {
                                                //line one
                                                for (var i = 0; i < lines[currentLine].length; i++) {
                                                    b.composite(f.clone().crop(fontString.indexOf(bufferLineOne[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 163);
                                                }
                                            }
                                            else {
                                                //line one
                                                for (var i = 0; i < lines[currentLine - 1].length; i++) {
                                                    b.composite(f.clone().crop(fontString.indexOf(bufferLineOne[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 163);
                                                }
                                                //line two
                                                for (var i = 0; i < lines[currentLine].length; i++) {
                                                    b.composite(f.clone().crop(fontString.indexOf(bufferLineTwo[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 179);
                                                }
                                            }
                                        }
                                        if (gameState.currentMonster.stats.tempHealth > 0)
                                            b.composite(l.clone().resize((100 * (gameState.currentMonster.stats.tempHealth / gameState.currentMonster.stats.health)), 10), 85, 32);
                                        if (gameState.currentParty[0].stats.tempHealth > 0)
                                            b.composite(l.clone().resize((100 * (gameState.currentParty[0].stats.tempHealth / gameState.currentParty[0].stats.health)), 10), 225, 138);
                                        b.composite(white.clone().crop(0, 0, 75, 200), 0, 0);
                                        b.composite(white.clone().crop(0, 0, 75, 200), 325, 0);
                                        encoder.addFrame(b.bitmap.data);
                                        buffer += lines[currentLine][characterCount] || ' ';
                                        if (currentLine == 0)
                                            bufferLineOne += lines[currentLine][characterCount] || ' ';
                                        else {
                                            bufferLineTwo += lines[currentLine][characterCount] || ' ';
                                        }
                                        characterCount++;
                                        if (characterCount > lines[currentLine].length) {
                                            characterCount = 0;
                                            currentLine++;
                                            if (currentLine > 1) {
                                                bufferLineOne = bufferLineTwo;
                                                bufferLineTwo = "";
                                            }
                                        }
                                    }
                                    //do the player's attack animation
                                    encoder.setDelay(50);
                                    doesDamage = false;
                                    switch (attack) {
                                        case "tackle":
                                            doesDamage = true;
                                            for (var i = 0; i < 5; i++) {
                                                var offset = 0;
                                                if (i == 1 || i == 3)
                                                    offset = -5;
                                                else if (i == 2)
                                                    offset = -10;

                                                b = wbg.clone();
                                                m = mon.clone();
                                                l = lif.clone();
                                                if (gameState.currentMonster.stats.tempHealth > 0)
                                                    b.composite(l.clone().resize((100 * (gameState.currentMonster.stats.tempHealth / gameState.currentMonster.stats.health)), 10), 85, 32);
                                                if (gameState.currentParty[0].stats.tempHealth > 0)
                                                    b.composite(l.clone().resize((100 * (gameState.currentParty[0].stats.tempHealth / gameState.currentParty[0].stats.health)), 10), 225, 138);
                                                b.composite(m.clone(), 280 + offset, 32);
                                                b.composite(white.clone().crop(0, 0, 75, 200), 0, 0);
                                                b.composite(white.clone().crop(0, 0, 75, 200), 325, 0);
                                                encoder.addFrame(b.bitmap.data);
                                            }
                                            break;
                                        case "string shot":
                                            break;
                                    }
                                    //animate enemy's health bar going down
                                    if (doesDamage) {
                                        var startingHealth = gameState.currentMonster.stats.tempHealth;
                                        gameState.currentMonster.stats.tempHealth -= gameState.currentParty[0].stats.tempAttack;
                                        if (gameState.currentMonster.stats.tempHealth <= 0)
                                            gameState.currentMonster.stats.tempHealth = 0;
                                        var endHealth = gameState.currentMonster.stats.tempHealth;
                                        var difference = (startingHealth - endHealth) / 10;
                                        for (var i = 0; i < 10; i++) {
                                            b = wbg.clone();
                                            m = mon.clone();
                                            l = lif.clone();
                                            if (gameState.currentParty[0].stats.tempHealth > 0)
                                                b.composite(l.clone().resize((100 * (gameState.currentParty[0].stats.tempHealth / gameState.currentParty[0].stats.health)), 10), 225, 138);
                                            if (gameState.currentMonster.stats.tempHealth > 0)
                                                b.composite(l.clone().resize((100 * ((startingHealth - (difference * i)) / gameState.currentMonster.stats.health)), 10), 85, 32);
                                            b.composite(m.clone(), 280 + offset, 32);
                                            b.composite(white.clone().crop(0, 0, 75, 200), 0, 0);
                                            b.composite(white.clone().crop(0, 0, 75, 200), 325, 0);
                                            encoder.addFrame(b.bitmap.data);
                                        }
                                    }
                                    //check if enemy is dead
                                    if (gameState.currentMonster.stats.tempHealth <= 0)
                                    {
                                        var text = "ENEMY " + gameState.currentMonster.name.toUpperCase() + " FAINTED!";
                                        var buffer = "", bufferLineOne = "", bufferLineTwo = "";
                                        var currentLine = 0, characterCount = 0;
                                        var len = 15;
                                        var lines = splitter(text, 15);
                                        //say what attack the player is going to do
                                        while (currentLine < lines.length) {
                                            b = wbg.clone();
                                            m = mon.clone();
                                            l = lif.clone();
                                            var d = db.clone();
                                            var f = font.clone();

                                            if (currentLine == lines.length - 1 && characterCount == lines[currentLine].length) {
                                                encoder.setDelay(500);
                                            }
                                            else {
                                                encoder.setDelay(50);
                                            }

                                            b.composite(m.clone(), 280, 32);
                                            if (buffer.length != 0) {
                                                b.composite(d.clone(), 75, 158);
                                                if (currentLine == 0) {
                                                    //line one
                                                    for (var i = 0; i < lines[currentLine].length; i++) {
                                                        b.composite(f.clone().crop(fontString.indexOf(bufferLineOne[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 163);
                                                    }
                                                }
                                                else {
                                                    //line one
                                                    for (var i = 0; i < lines[currentLine - 1].length; i++) {
                                                        b.composite(f.clone().crop(fontString.indexOf(bufferLineOne[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 163);
                                                    }
                                                    //line two
                                                    for (var i = 0; i < lines[currentLine].length; i++) {
                                                        b.composite(f.clone().crop(fontString.indexOf(bufferLineTwo[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 179);
                                                    }
                                                }
                                            }
                                            if (gameState.currentMonster.stats.tempHealth > 0)
                                                b.composite(l.clone().resize((100 * (gameState.currentMonster.stats.tempHealth / gameState.currentMonster.stats.health)), 10), 85, 32);
                                            if (gameState.currentParty[0].stats.tempHealth > 0) 
                                                b.composite(l.clone().resize((100 * (gameState.currentParty[0].stats.tempHealth / gameState.currentParty[0].stats.health)), 10), 225, 138);
                                            b.composite(white.clone().crop(0, 0, 75, 200), 0, 0);
                                            b.composite(white.clone().crop(0, 0, 75, 200), 325, 0);
                                            encoder.addFrame(b.bitmap.data);
                                            buffer += lines[currentLine][characterCount] || ' ';
                                            if (currentLine == 0)
                                                bufferLineOne += lines[currentLine][characterCount] || ' ';
                                            else {
                                                bufferLineTwo += lines[currentLine][characterCount] || ' ';
                                            }
                                            characterCount++;
                                            if (characterCount > lines[currentLine].length) {
                                                characterCount = 0;
                                                currentLine++;
                                                if (currentLine > 1) {
                                                    bufferLineOne = bufferLineTwo;
                                                    bufferLineTwo = "";
                                                }
                                            }
                                        }
                                    }
                                    else {
                                        //Show battle options
                                        encoder.setDelay(3000);

                                        b = wbg.clone();
                                        m = mon.clone();
                                        var d = db.clone();
                                        var f = font.clone();

                                        b.composite(m.clone(), 280, 32);
                                        b.composite(d.clone(), 75, 158);
                                        l = lif.clone();
                                        bufferLineOne = "FIGHT     ITEM ";
                                        bufferLineTwo = "MONSTERS  RUN  ";

                                        //line one
                                        for (var i = 0; i < bufferLineOne.length; i++) {
                                            b.composite(f.clone().crop(fontString.indexOf(bufferLineOne[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 163);
                                        }
                                        //line two
                                        for (var i = 0; i < bufferLineTwo.length; i++) {
                                            b.composite(f.clone().crop(fontString.indexOf(bufferLineTwo[i] || ' ') * 16, 0, 16, 16), 80 + (16 * i), 179);
                                        }
                                        if (gameState.currentMonster.stats.tempHealth > 0)
                                            b.composite(l.clone().resize((100 * (gameState.currentMonster.stats.tempHealth / gameState.currentMonster.stats.health)), 10), 85, 32);
                                        if (gameState.currentParty[0].stats.tempHealth > 0)
                                            b.composite(l.clone().resize((100 * (gameState.currentParty[0].stats.tempHealth / gameState.currentParty[0].stats.health)), 10), 225, 138);
                                        b.composite(white.clone().crop(0, 0, 75, 200), 0, 0);
                                        b.composite(white.clone().crop(0, 0, 75, 200), 325, 0);
                                        encoder.addFrame(b.bitmap.data);
                                    }
                                }
                                console.log("done with gif");
                                encoder.finish();
                            }
                        });
                    });
                });

                switch (attack) {
                    case "tackle":
                        break;
                }
            });
        });
    }
    else
    {
        console.log("no current enemy found!");
    }
}

function checkCollisions(x, y, width, height){
	for (var i = 0; i < gameState.objects.length; i++){
		if (x < gameState.objects[i].x + gameState.objects[i].width &&
		x + width > gameState.objects[i].x &&
		y < gameState.objects[i].y + gameState.objects[i].height &&
		y + height > gameState.objects[i].y)
		{
			//console.log("collision found, x: " + x + ", y: " + y + ", width: " + width + ", height: " + height)
			return true;
		}
	}
	//console.log("no collision, x: " + x + ", y: " + y + ", width: " + width + ", height: " + height)
	return false;
}

function checkGrass(x, y, width, height) {
    console.log("entered checkGrass");
    for (var i = 0; i < gameState.currentMap.grasses.length; i++) {
        if (x < gameState.currentMap.grasses[i].x + gameState.currentMap.grasses[i].width &&
            x + width > gameState.currentMap.grasses[i].x &&
            y < gameState.currentMap.grasses[i].y + gameState.currentMap.grasses[i].height &&
            y + height > gameState.currentMap.grasses[i].y) {
            //console.log("collision found, x: " + x + ", y: " + y + ", width: " + width + ", height: " + height)
            return true;
        }
    }
    //console.log("no collision, x: " + x + ", y: " + y + ", width: " + width + ", height: " + height)
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
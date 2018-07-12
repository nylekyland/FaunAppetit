var fs = require('fs'), path = require ('path'), Twit = require('twit'),
config = require(path.join(__dirname, 'config.js')),
jimp = require('Jimp'),
gifEncoder = require('gifencoder');

var T = new Twit(config);

var mostRecentBotTweet = [];
var tweets = [];

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
			validCommands = ['north', 'south', 'east', 'west', 'up', 'down', 'left', 'right']
			for (var i = 0; i < commands.length; i++){
				if (validCommands.indexOf(commands[i]) > -1){
					switch(commands[i]){
						case "north":
						case "up":
							buildImage("up");
						break;
						case "south":
						case "down":
							buildImage("down");
						break;
						case "west":
						case "left":
							buildImage("left");
						break;
						case "east":
						case "right":
							buildImage("right");
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

function buildImage(command){
	var encoder = new gifEncoder(400, 200);
	encoder.createReadStream().pipe(fs.createWriteStream("test.gif"))
	encoder.start();
	encoder.setRepeat(0);	//0 for repeat, -1 for no-repeat
	encoder.setDelay(75); 	//frame delay in ms
	encoder.setQuality(10);	//image quality, 10 is default
	var image = jimp.read("assets/map.png", function(err, img){
		if (err) throw err;
		img.crop(0, 0, 400, 200);
		console.log("done with first frame image");
		return img;
	});
	var playerImage = jimp.read("assets/player.png", function(err, img){
		if (err) throw err;
		//var frame = img.crop(gameState.playerSprite.currentFrame * gameState.playerSprite.spriteWidth, gameState.playerSprite.currentAnimation * gameState.playerSprite.spriteHeight, gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight);
		console.log("done with player image");
		
		var p = img.clone();
		var m = image;
		
		var pFrame = p.clone().crop(gameState.playerSprite.currentFrame * gameState.playerSprite.spriteWidth, gameState.playerSprite.currentAnimation * gameState.playerSprite.spriteHeight, gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight);
		m.composite(pFrame, 200, 100);
		encoder.addFrame(m.bitmap.data);
		gameState.playerSprite.currentFrame++;
		pFrame = p.clone().crop(gameState.playerSprite.currentFrame * gameState.playerSprite.spriteWidth, gameState.playerSprite.currentAnimation * gameState.playerSprite.spriteHeight, gameState.playerSprite.spriteWidth, gameState.playerSprite.spriteHeight);
		m.composite(pFrame, 200, 100);
		encoder.addFrame(m.bitmap.data);
		console.log("done with gif");
		encoder.finish();
	});
	//use image.composite to paste an image over a canvas
}
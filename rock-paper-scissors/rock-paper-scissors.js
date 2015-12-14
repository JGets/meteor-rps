Games = new Mongo.Collection("games");

if (Meteor.isClient) {

	Session.setDefault('playerID', 0);
	// Session.setDefault('selected', 'none');

	Meteor.startup(function(){
		var path = window.location.pathname;

		var regexp = /\/player(\d+)\/?/i;
		if(regexp.test(path)){
			var matches = path.match(regexp);
			var n = parseInt(matches[1], 10);
			if(n == 1 || n == 2){
				Session.set('playerID', n);
			}
		}


		Meteor.call("initGame", function(error, result){
			if(error){

			}
			else{
				Session.set('gameID', result);
				console.log("Game ID: "+result);
			}
		});

		

	});

	Template.main.helpers({
		validPlayer : function(){
			return Session.get('playerID') !== 0;
		}
	});

	var resultClassHelper = function(a, b){
		if(a == b){
			return 'tie';
		}

		if( (a == "rock" && b == "scissors")
			|| (a == "scissors" && b == "paper")
			|| (a == "paper" && b == "rock") ){
			return "winner";
		}

		return "loser";
	}

	Template.game.helpers({
		playerName : function(){
			return "Player " + Session.get('playerID');
		},
		otherPlayerName : function(){
			return "Player " + (3-Session.get('playerID'));
		},
		madeSelection : function(){
			var g = Games.findOne(Session.get('gameID'));
			if(Session.get('playerID') == 1){
				return g.p1Play !== null;
			}
			else{
				return g.p2Play !== null;
			}
		},
		playerSelection : function(){
			// return Session.get("selected")
			var g = Games.findOne(Session.get('gameID'));
			if(Session.get('playerID') == 1){
				return g.p1Play;
			}
			else{
				return g.p2Play;
			}
		},
		otherPlayerSelection : function(){
			var g = Games.findOne(Session.get('gameID'));
			if(Session.get('playerID') == 1){
				return g.p2Play;
			}
			else{
				return g.p1Play;
			}
		},
		gameOver : function(){
			var game = Games.findOne(Session.get("gameID"));
			return game.p1Play != null && game.p2Play != null;
		},

		playerResult : function(){
			var game = Games.findOne(Session.get("gameID"));
			if(Session.get('playerID') == 1){
				return resultClassHelper(game.p1Play, game.p2Play);
			}
			else{
				return resultClassHelper(game.p2Play, game.p1Play);
			}			
		},
		otherPlayerResult : function(){
			var game = Games.findOne(Session.get("gameID"));
			if(Session.get('playerID') == 1){
				return resultClassHelper(game.p2Play, game.p1Play);
			}
			else{
				return resultClassHelper(game.p1Play, game.p2Play);
			}
		},
		resultTitle : function(){
			var game = Games.findOne(Session.get("gameID"));
			var result;
			if(Session.get('playerID') == 1){
				result = resultClassHelper(game.p1Play, game.p2Play);
			}
			else{
				result = resultClassHelper(game.p2Play, game.p1Play);
			}
			if(result == "tie"){
				return "Tie Game";
			}
			else if(result == "winner"){
				return "You Won!";
			}
			else{
				return "You Lost";
			}
		}
	});

	Template.game.events({
		"click button.selection-button" : function(event){
			var $b = $(event.currentTarget);
			var play = $b.attr("data-value");

			// Session.set("selected", play);

			Meteor.call("setPlay", Session.get('gameID'), Session.get('playerID'), play);
		},
		"click button.reset-button" : function(event){
			Meteor.call("resetGame", Session.get('gameID'));
		}
	});

	// Template.hello.events({
	// 	'click button': function () {
	// 		// increment the counter when button is clicked
	// 		Session.set('counter', Session.get('counter') + 1);
	// 	}
	// });
}

if (Meteor.isServer) {
	Meteor.startup(function () {
		// code to run on server at startup
	});

	Meteor.methods({
		initGame : function(){
			var gameID = null;
			//get all incomplete games, ordered by start time
			var activeGames = Games.find({}, {sort: ["startTime"]}).fetch();
			console.log(activeGames);

			
			if(activeGames.length == 0){
				gameID = Games.insert({
					// complete: false,
					startTime: (Date.now()),
					p1Play: null,
					p2Play: null
				});
			}
			else{
				gameID = activeGames[0]._id;
				if(activeGames.length > 1){
					//remove any other incomplete games
					for(var i = 1; i < activeGames.length; i++){
						Games.remove(activeGames[i]._id);
					}
				}
			}

			return gameID;
		},
		resetGame : function(gameID){
			var game = Games.findOne(gameID);
			//only allow to reset the game after both players have made a play
			if(typeof(game) != "undefined" && game.p1Play != null && game.p2Play != null){
				Games.update(gameID, {
					$set : {
						p1Play : null,
						p2Play : null
					}
				});
			}

		},
		setPlay : function(gameID, playerID, play){
			// var g = Games.findOne(gameID);
			if(playerID == 1){
				Games.update(gameID, {
					$set: {
						// complete : (g.p2Play !== null),
						p1Play : play,
					}
				});
			}
			else{
				Games.update(gameID, {
					$set: {
						// complete : (g.p1Play !== null),
						p2Play : play
					}
				});
			}
		},
		getGameResult : function(gameID){
			return Games.findOne(gameID);
		}
	});
}




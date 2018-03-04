var express = require('express');
var app = express();

var Twit = require('twit');

var Bitly = require('bitly');

var request = require('request');

var pj = require('phrasejumble');

var fs = require('fs');
var Jimp = require("jimp");


var title = '';
var category = '';
var description = '';
var thumbnailURL = '';
var shortURL = ''; 
var longURL = '';

var b64content = '';

var response = '';

var tags = ['#DontDrinkAndDrive','#Cocktails','#DrinkRecipes','#DrinkResponsibly', '#HappyHour', '#ShopLocal'];

console.log('Starting Up!!!');

var apiURL = 'https://www.thecocktaildb.com/api/json/v1/1/random.php'

var recipeURL = 'https://www.thecocktaildb.com/drink.php?c='

app.set('port', (process.env.PORT || 5000));

// Discourage general browsers
app.get('/', function(req, res) {
  res.writeHead(403, {'Content-Type': 'text/html'}); 

  res.write('Go Away');
  res.end();
});

app.get('/shaker', function(req, res) {
	res.writeHead(200, {'Content-Type': 'text/html'}); 
	console.log('Starting Shaker...');
	res.write('Starting Shaker...');
	loadRecipe();

	function loadRecipe(){

		request(apiURL, function(error, response, data){

			// console.log(data);
			// First we'll check to make sure no errors occurred when making the request
	        if(!error){		       
					processRecipe(JSON.parse(data));			
	        }else{
		        console.log('Request FAILED');
	        }
	    });    
	    
	} // end  function loadRecipe
	    
	function processRecipe(data){
		// console.log(data.drinks[0])
		console.log('Title: '+data.drinks[0].strDrink);
	    console.log('Description: '+data.drinks[0].strInstructions);
	    console.log('Long URL: '+recipeURL+data.drinks[0].idDrink);

	    var bitly = new Bitly( process.env.bitly_access_token );

	    longURL = recipeURL+data.drinks[0].idDrink

		bitly.shorten(longURL)
			.then(function(response) {
			// Do something with data 

			shortURL = response.data.url;
			
			console.log('Short URL: '+shortURL);

		}, function(error) {
			
			throw error;
			res.end();
		});

	    

	} // end function processRecipe
}); // end shaker

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

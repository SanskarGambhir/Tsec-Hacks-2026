import dotenv from 'dotenv';

dotenv.config({
  path: './.env' // Path for .env file
});

let myUsername = process.env.MYUSERNAME; // This is how you access the variables from .env file

console.log("Username is: " + myUsername);
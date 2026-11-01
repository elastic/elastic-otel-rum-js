# Elaspic Appplication

TODO: 
Elaspic is web application which displays a gallery of the photos the user has previously uploaded
to it. The UI is consists in 3 screens
- login: the page ask for the username and stores it during the whole session
- gallery: here the user can see the pictures in a grid. Images are a lighter version so there is less bytes to load (thumbnails)
- detail: here the use can see the original image. he also can add tags and put comment that will be linked to his username.

## Structure of the application

The application is split into 2 services.

### API Service

The API is a nodejs applicaiton that is built on top of the express framework. I provides some endpoints for user
registration and authentifcation and some RESTful URLs for clients to consume.

- /register: this endpoint that only accepts POST requrest and its goal is to register new users into the system.
for the register to work it requires a username, a valid email and a password. these fields should be validated:
- username: required and unique in the system. only alphanumerical chars and "_" are accepted.
- email: required and unique in the system. must be a valid email
- password: required. any letter, number or special chars and min lenght should be 10

Validation errors in format like password too short should be returned explicitly explaining what is failing. Example:
```json
{
  "message": "Validation error",
  "errors": [
    { "field": "username", "message": "the username field contains invalid chars" },
    { "field": "email", "message": "the email field contains s not an email" },
    { "field": "password", "message": "the password field is too short" },
  ]
}
```
but do not disclose if a user or email is already in the system. Instead return a generic error.
```json
{
  "message": "userame or email already registered"
}
```

- /login: this endpoint does the login funciton. accepts only POST request and validates username & password returning
a token if correct. this token will be used later to validate the client has authenticated. Similar to register
show explicit errors in field validations but if the format is correct but if the validation with the DB failed return
```json
{
  "message": "invalid userame or password"
}
```

- /pics: this is the resource to manage pictures for the current user and it follows the classic REST rules. The user 
is in the context of the request thanks to the token returned un the /login.
A simple get request returns a list, "/pics/:id" returns the picture with the given id or a 404 if not exists,
post to "/pics" will save a new picture into the database and a delete to "/pics/:id" will remove the picture.

- /pisc/:id/comments: this will be REST enpoint for comments related to the pics. The comments will keep a reference of the user
that did it.

- /users: for this resource it will only allow to list users (GET request) and create users (post request). The user model contains only the username and id. the is is a uuid generated at the moment of creation.

- /users/{userId}/pics: resource of the pictures of another user in the system. The GET request returns the pic uploaded by
the username with the {userId}. It is not allowed to POST,PUT,DELETE a pic of nother user so this acitons are not implemented.

- /users/{id}/pics/{picId}/comments: rest endpoint for the comments of a picture from another user in the system.
GET will return al the comments but the current user is only allowed to:
- POST a new comment
- PUT (edit) a comment he authored. He cannot modify comments from others
- DELETE a comment he authored. He cannot delete comment from others. It's a logical delete and it won't be removed form the DB



### The UI Service

This is Reactjs application that works in single page application mode. For styling and
layout its using Elastic's desing system. Documentation can be found in https://eui.elastic.co/

The application has the following screens/routes:

- "/login": login route shows a login form asking only for the username and password. Validation of format should be done before posting the data (mathicn backend format validations). IMPORTANT: if the user is not set (not logged in) the other routes must redirect to this one.
Th elogin form must show a link to the regitration form for users who want to join.

- "/register": shows a registration form where it asks for username, password and email. All required and format validation should be done before
posting data to the register endpoint.

- "/": this route redirects to "/login" if the user is not authenticated. The view will display a sidebar with 2 options
  - pics: this option is preselected. when selected it will display the pics of the current user. clickin on a picture will navigate to "/pics/{picId}"
  - users: when this option is selected 

 If he is it will diplay a grid of the pictures
he has uploaded. Doing a click to a picture will navigate to the "/pics/{picId}" route.

- "/pics/{picId}": this route will show a view that displays the picture and on the side it will show a list of the comments made by the users. the user will br able to navigate bac
Each comment will also display the username that did it. At the end of the list it will be a text box allowing the user to comment in his own picture

- /

# Elaspic Appplication

Elaspic is web application which displays a gallery of the photos the user has previously uploaded
to it. The UI is consists in 3 screens
- login: the page ask for the username and stores it during the whole session
- gallery: here the user can see the pictures in a grid. Images are a lighter version so there is less bytes to load (thumbnails)
- detail: here the use can see the original image. he also can add tags and put comment that will be linked to his username.

## Structure of the application

The application is split into 2 services.

### API Service

The API is a nodejs applicaiton that is built on top of the express framework. I provides a couple of
RESTful URLs for clients to consume

- /users: for this resource it will only allow to list users (get request) and create users (post request). The user model contains only the username and id. the is is a uuid generated at the moment of creation.

- /pics: this is the resource to manage pictures and it follows the classic REST rules. A simple
get request returns a list, "/pics/:id" returns the picture with the given id or a 404 if not exists,
post to "/pics" will save a new picture into the database and a delete to "/pics/:id" will remove the picture.

- /pisc/:id/comments: this will be REST enpoint for comments related to the pics. The comments will keep a reference of the user that did it


### The UI Service

This is Reactjs application that works in single page application mode. For styling and
layout its using Elastic's desing system. Documentation can be found in https://eui.elastic.co/

The application has 3 routes:
- "/login": login route shows a login form asking only for the username. It will disaply a filed where the user can pick an existing username or use a new one. The username will be carried over the entire session and will be used if posts a comment. IMPORTANT: if the user is not set (not logged in) the other routes must redirect to this one.

- "/": this route shows the gallery of pictures. It will show a grid of pictures and it also has
a search field at the top to search by tag. the field should show autocompletin for the existing tags

- "/detail/:id": this route will show a view that displays the picture and on the side it will show the tags added to this picture and a list of the comments made by the users


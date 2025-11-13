# D3: World of Bits

## Game Design Vision

A location-based token crafting game where players explore the real world to collect and combine tokens. Players can only interact with nearby cells on a grid, collecting tokens and combining identical values to create tokens of double value. The goal is to craft a token of sufficiently high value through strategic collection and combination.

## Technologies

-TypeScript for game code, minimal HTML, CSS in `style.css`
-Leaflet for map rendering
-Deno and Vite for building
-GitHub Actions + GitHub Pages for deployment

### D3.a: Core mechanics (token collection and crafting)

Key technical challenge:
Can you assemble a map-based user interface using the Leaflet mapping framework?\
Key gameplay challenge:
Can players collect and craft tokens from nearby locations to finally make one of sufficiently high value?

#### Steps

Step 1:
-Set up the basic page
-Make a title and a few divs in TypeScript for the map and status area.
-Add some quick CSS so it looks okay.
-Run and make sure it shows up before doing anything else.
Step 2:
-Get the map showing
-Use Leaflet to center the map on the classroom coordinates.
-Lock the zoom level and turn off scroll zoom.
-Add the OpenStreetMap tiles and a marker for the player.
-Commit and test that it loads.
Step 3:
Draw one cell
-Add constants for tile size and neighborhood size.
-Make a function that converts i and j into map bounds.
-Draw one rectangle just to see if it works.
Step 4:
-Draw a grid around the player
-Loop through nearby cells and draw rectangles for all of them.
-Check that the grid fills the map nicely and that nothing is offscreen.
-Clean up any messy code and push.
Step 5:
-Add tokens
-Use the luck function to decide if a cell should have a token.
-If yes, display its value directly on the map (like 1 or 2).
-Reload the page a few times to make sure the same cells always have tokens.
Step 6:
-Limit interactions
-Only let the player interact with cells that are within about three cells of their position.
-Maybe color those nearby cells differently.
-Make sure clicks outside the range don’t do anything.
Step 7:
-Inventory
-Player can only hold one token at a time.
-Clicking a nearby cell with a token picks it up and clears the cell.
-Show what the player is holding in a little status area.
-Commit and test.
Step 8:
-Placing and combining
-If holding a token and clicking an empty cell, place it down.
-If holding a token and clicking a cell with the same value, combine them into one doubled value.
-Clear the hand after placing or combining.
-Show small messages when a move isn’t allowed.
Step 9:
-Win condition
-Pick a goal value like 16.
-When the player reaches that value, show a “You win” message.
-Maybe add a reset button so it’s easy to replay.
Step 10:
-Cleanup and finish
-Remove debug logs and rename any weird variables.
-Do one cleanup-only commit.
-Mark the milestone done in the commit message.
-Make sure the deployed version works properly.

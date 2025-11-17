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

##### D3.b: Globe-spanning Gameplay

Key technical challenge:
Can you assemble a map-based user interface using the Leaflet mapping framework?
Key gameplay challenge:
Can players collect and craft tokens from nearby locations to finally make one of sufficiently high value?

###### Steps for B

Step 1:
-Change coordinate system to Null Island
-Replace classroom-relative coordinates (0,0 at classroom) with global coordinates anchored at Null Island (0° lat, 0° lng).
-Create helper functions to convert lat/lng to cell (i,j) and cell (i,j) to lat/lng bounds.
-Update all existing code to use these conversion functions.
-Test that existing cells still appear in correct positions.
Step 2:
-Track player position separately
-Add a playerPosition variable to track the player's current cell (i,j).
-Initialize it to the cell containing the classroom coordinates.
-Update the playerMarker position but keep it separate from cell coordinates.
-Commit and verify player marker still shows correctly.
Step 3:
-Add movement buttons
-Create four buttons in the control panel: North, South, East, West.
-Each button moves the player by one cell in that direction.
-Update playerPosition when a button is clicked.
-Move the playerMarker on the map to follow the new position.
-Test that clicking buttons moves the marker around.
Step 4:
-Dynamic cell spawning based on player position
-Remove the initial grid spawning loop from D3.a.
-Create a function that spawns cells in a neighborhood around the player's current position.
-Call this function whenever the player moves.
-Make sure cells fill the visible area of the map.
Step 5:
-Clear old cells when moving
-Before spawning new cells, remove all existing rectangles and labels from the map.
-Clear the cellRects and cellLabels maps.
-Make cells "memoryless" by clearing the cellStates map too (this creates the farming bug).
-Test that moving causes fresh cells to appear.
Step 6:
-Update interaction range to follow player
-Change the isNearby function to check distance from the current playerPosition, not (0,0).
-Update cell coloring to highlight cells near the player's new position.
-Test that only cells near the player are interactable after moving.
Step 7:
-Recenter map on player movement
-When the player moves, recenter the map on the new player position.
-Use map.panTo() to smoothly move the view.
-Make sure this doesn't conflict with manual scrolling.
Step 8:
-Handle manual map scrolling
-Add a moveend event listener to detect when the user scrolls the map.
-When the map stops moving, respawn cells to fill the visible area.
-Make sure cells still reference the player's actual position for interaction checks.
-Test both player movement and manual scrolling.
Step 9:
-Increase victory threshold
-Change GOAL_VALUE to something higher (like 64 or 128).
-Update the win message to reflect the new goal.
-Play through the game to verify it's still achievable by moving around.
Step 10:
-Cleanup and finish
-Remove any leftover debug code or console logs.
-Check that all coordinate conversions are consistent.
-Do one cleanup-only commit with no new features.
-Mark milestone complete with "(D3.b complete)" in commit message.
-Deploy and test that the game works on the web.

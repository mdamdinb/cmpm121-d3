import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";
import "./style.css";

// ==================== CONSTANTS ====================

const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const INTERACTION_RADIUS = 3;
const CACHE_SPAWN_PROBABILITY = 0.1;
const GOAL_VALUE = 64;

// ==================== GAME STATE ====================

let heldToken: number | null = null;

const cellStates = new Map<string, number | null>();

// ==================== UI SETUP ====================

const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);
const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);
const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

//add OpenStreetMap tiles
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

//add player marker
const playerMarker = leaflet.marker(CLASSROOM_LATLNG);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// ==================== HELPER FUNCTIONS ====================

//get a unique key for a cell
function getCellKey(i: number, j: number): string {
  return `${i},${j}`;
}

function cellDistance(i1: number, j1: number, i2: number, j2: number): number {
  return Math.max(Math.abs(i1 - i2), Math.abs(j1 - j2));
}

//check if a cell is within interaction range of player (at 0,0)
function isNearby(i: number, j: number): boolean {
  return cellDistance(0, 0, i, j) <= INTERACTION_RADIUS;
}

//initialize or get the state of a cell
function getCellState(i: number, j: number): number | null {
  const key = getCellKey(i, j);
  if (!cellStates.has(key)) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      const value = luck([i, j, "value"].toString()) < 0.5 ? 1 : 2;
      cellStates.set(key, value);
    } else {
      cellStates.set(key, null);
    }
  }

  return cellStates.get(key)!;
}

function setCellState(i: number, j: number, value: number | null): void {
  const key = getCellKey(i, j);
  cellStates.set(key, value);
}

function updateStatus(): void {
  if (heldToken === null) {
    statusPanelDiv.innerHTML = "Inventory: Empty";
  } else {
    statusPanelDiv.innerHTML =
      `Inventory: Token of value <strong>${heldToken}</strong>`;
  }
  if (heldToken !== null && heldToken >= GOAL_VALUE) {
    statusPanelDiv.innerHTML +=
      `<br><strong style="color: green;">🎉 YOU WIN! You crafted a token of value ${heldToken}!</strong>`;
  }
}

// ==================== CELL RENDERING ====================

function spawnCell(i: number, j: number): void {
  const origin = CLASSROOM_LATLNG;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  const tokenValue = getCellState(i, j);
  const nearby = isNearby(i, j);
  const rect = leaflet.rectangle(bounds, {
    color: nearby ? "#3388ff" : "#888888",
    weight: 1,
    fillOpacity: nearby ? 0.2 : 0.1,
  });
  rect.addTo(map);

  //if cell has a token, display it
  let tokenLabel: leaflet.Marker | null = null;
  if (tokenValue !== null) {
    const center = bounds.getCenter();
    tokenLabel = leaflet.marker(center, {
      icon: leaflet.divIcon({
        className: "token-label",
        html:
          `<div style="font-size: 16px; font-weight: bold; color: #333; background: rgba(255,255,255,0.9); padding: 4px 8px; border-radius: 4px; border: 2px solid #333;">${tokenValue}</div>`,
        iconSize: [40, 40],
      }),
    });
    tokenLabel.addTo(map);
  }

  rect.on("click", () => {
    if (!nearby) {
      alert("Too far away! Move closer to interact with this cell.");
      return;
    }
    handleCellClick(i, j, rect, tokenLabel);
  });
}

function handleCellClick(
  i: number,
  j: number,
  rect: leaflet.Rectangle,
  tokenLabel: leaflet.Marker | null,
): void {
  const cellValue = getCellState(i, j);

  //case 1:cell has a token, player has no token
  if (cellValue !== null && heldToken === null) {
    heldToken = cellValue;
    setCellState(i, j, null);
    if (tokenLabel) {
      map.removeLayer(tokenLabel);
    }
    updateStatus();
    return;
  }

  // Case 2: Cell is empty, player has a token -> Place down
  if (cellValue === null && heldToken !== null) {
    setCellState(i, j, heldToken);
    const bounds = rect.getBounds();
    const center = bounds.getCenter();
    const newLabel = leaflet.marker(center, {
      icon: leaflet.divIcon({
        className: "token-label",
        html:
          `<div style="font-size: 16px; font-weight: bold; color: #333; background: rgba(255,255,255,0.9); padding: 4px 8px; border-radius: 4px; border: 2px solid #333;">${heldToken}</div>`,
        iconSize: [40, 40],
      }),
    });
    newLabel.addTo(map);
    heldToken = null;
    updateStatus();
    return;
  }

  //case 3:cell has token, player has token of same value
  if (cellValue !== null && heldToken !== null && cellValue === heldToken) {
    const newValue = cellValue * 2;
    setCellState(i, j, newValue);
    if (tokenLabel) {
      map.removeLayer(tokenLabel);
    }
    const bounds = rect.getBounds();
    const center = bounds.getCenter();
    const newLabel = leaflet.marker(center, {
      icon: leaflet.divIcon({
        className: "token-label",
        html:
          `<div style="font-size: 16px; font-weight: bold; color: #333; background: rgba(255,255,255,0.9); padding: 4px 8px; border-radius: 4px; border: 2px solid #333;">${newValue}</div>`,
        iconSize: [40, 40],
      }),
    });
    newLabel.addTo(map);
    heldToken = null;
    updateStatus();
    return;
  }

  //case 4:cell has token, player has token of different value
  if (cellValue !== null && heldToken !== null && cellValue !== heldToken) {
    alert(
      `Cannot combine! Cell has ${cellValue}, you have ${heldToken}. Values must match to combine.`,
    );
    return;
  }
}

// ==================== INITIALIZE GAME ====================

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    spawnCell(i, j);
  }
}

updateStatus();

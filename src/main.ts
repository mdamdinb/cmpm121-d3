import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";
import "./style.css";

// ==================== MOVEMENT STRATEGY (FACADE PATTERN) ====================

// Interface for different movement strategies
interface MovementStrategy {
  getCurrentPosition(): { i: number; j: number };
  startTracking(onPositionChange: (i: number, j: number) => void): void;
  stopTracking(): void;
}

// Button-based movement strategy
class ButtonMovementStrategy implements MovementStrategy {
  private position: { i: number; j: number };
  private onPositionChange: ((i: number, j: number) => void) | null = null;

  constructor(initialPosition: { i: number; j: number }) {
    this.position = { ...initialPosition };
  }

  getCurrentPosition(): { i: number; j: number } {
    return { ...this.position };
  }

  startTracking(onPositionChange: (i: number, j: number) => void): void {
    this.onPositionChange = onPositionChange;
  }

  stopTracking(): void {
    this.onPositionChange = null;
  }

  moveBy(di: number, dj: number): void {
    this.position.i += di;
    this.position.j += dj;
    if (this.onPositionChange) {
      this.onPositionChange(this.position.i, this.position.j);
    }
  }
}

// Geolocation-based movement strategy
class GeolocationMovementStrategy implements MovementStrategy {
  private position: { i: number; j: number };
  private onPositionChange: ((i: number, j: number) => void) | null = null;
  private watchId: number | null = null;

  constructor(initialPosition: { i: number; j: number }) {
    this.position = { ...initialPosition };
  }

  getCurrentPosition(): { i: number; j: number } {
    return { ...this.position };
  }

  startTracking(onPositionChange: (i: number, j: number) => void): void {
    this.onPositionChange = onPositionChange;

    if ("geolocation" in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          // Convert GPS coordinates to cell coordinates
          const cell = latLngToCell(
            position.coords.latitude,
            position.coords.longitude,
          );
          this.position = cell;
          if (this.onPositionChange) {
            this.onPositionChange(cell.i, cell.j);
          }
        },
        (error) => {
          console.error("Geolocation error:", error.message);
          alert(
            "Unable to get your location. Please check permissions or switch to button mode.",
          );
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000,
        },
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.onPositionChange = null;
  }
}

// ==================== CONSTANTS ====================

const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

const NULL_ISLAND = leaflet.latLng(0, 0); // Origin for global coordinate system

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const INTERACTION_RADIUS = 3;
const CACHE_SPAWN_PROBABILITY = 0.3;
const GOAL_VALUE = 64;

// ==================== GAME STATE ====================

let heldToken: number | null = null;
let movementStrategy: MovementStrategy | null = null; // Current movement strategy (Facade)

const cellStates = new Map<string, number | null>(); // Only stores modified cells
const modifiedCells = new Set<string>(); // Track which cells have been modified by player
const cellLabels = new Map<string, leaflet.Marker>(); // Track all token labels
const cellRects = new Map<string, leaflet.Rectangle>(); // Track all rectangles

// ==================== UI SETUP ====================

const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

// Add movement buttons (will be hidden in geolocation mode)
const movementButtonsDiv = document.createElement("div");
movementButtonsDiv.id = "movementButtons";
controlPanelDiv.append(movementButtonsDiv);

const northButton = document.createElement("button");
northButton.textContent = "⬆️ North";
northButton.onclick = () => {
  if (movementStrategy instanceof ButtonMovementStrategy) {
    movementStrategy.moveBy(1, 0);
  }
};
movementButtonsDiv.append(northButton);

const southButton = document.createElement("button");
southButton.textContent = "⬇️ South";
southButton.onclick = () => {
  if (movementStrategy instanceof ButtonMovementStrategy) {
    movementStrategy.moveBy(-1, 0);
  }
};
movementButtonsDiv.append(southButton);

const westButton = document.createElement("button");
westButton.textContent = "⬅️ West";
westButton.onclick = () => {
  if (movementStrategy instanceof ButtonMovementStrategy) {
    movementStrategy.moveBy(0, -1);
  }
};
movementButtonsDiv.append(westButton);

const eastButton = document.createElement("button");
eastButton.textContent = "➡️ East";
eastButton.onclick = () => {
  if (movementStrategy instanceof ButtonMovementStrategy) {
    movementStrategy.moveBy(0, 1);
  }
};
movementButtonsDiv.append(eastButton);

const modeToggleButton = document.createElement("button");
modeToggleButton.textContent = "📍 Switch to Geolocation";
modeToggleButton.onclick = () => toggleMovementMode();
controlPanelDiv.append(modeToggleButton);

const resetButton = document.createElement("button");
resetButton.textContent = "🔄 New Game";
resetButton.onclick = () => resetGameState();
controlPanelDiv.append(resetButton);

const modeIndicator = document.createElement("div");
modeIndicator.id = "modeIndicator";
modeIndicator.textContent = "Mode: Buttons";
controlPanelDiv.append(modeIndicator);

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

// ==================== PERSISTENCE (MEMENTO PATTERN) ====================

function saveGameState(): void {
  const gameState = {
    heldToken,
    playerPosition: movementStrategy?.getCurrentPosition() ||
      latLngToCell(CLASSROOM_LATLNG.lat, CLASSROOM_LATLNG.lng),
    cellStates: Array.from(cellStates.entries()),
    modifiedCells: Array.from(modifiedCells),
  };
  localStorage.setItem("gameState", JSON.stringify(gameState));
}

function loadGameState(): boolean {
  const saved = localStorage.getItem("gameState");
  if (!saved) return false;

  try {
    const gameState = JSON.parse(saved);
    heldToken = gameState.heldToken;

    cellStates.clear();
    for (const [key, value] of gameState.cellStates) {
      cellStates.set(key, value);
    }

    modifiedCells.clear();
    for (const key of gameState.modifiedCells) {
      modifiedCells.add(key);
    }

    return true;
  } catch (e) {
    console.error("Failed to load game state:", e);
    return false;
  }
}

function resetGameState(): void {
  if (
    confirm(
      "Are you sure you want to start a new game? All progress will be lost.",
    )
  ) {
    localStorage.removeItem("gameState");
    heldToken = null;
    cellStates.clear();
    modifiedCells.clear();

    const classroomCell = latLngToCell(
      CLASSROOM_LATLNG.lat,
      CLASSROOM_LATLNG.lng,
    );
    if (movementStrategy) {
      movementStrategy.stopTracking();
    }
    initializeMovementStrategy(classroomCell);

    clearCellVisuals();
    spawnCellsAroundPlayer();
    updateStatus();

    alert("New game started!");
  }
}

// ==================== HELPER FUNCTIONS ====================

//get a unique key for a cell
function getCellKey(i: number, j: number): string {
  return `${i},${j}`;
}

//convert lat/lng to cell coordinates (i, j)
function latLngToCell(lat: number, lng: number): { i: number; j: number } {
  const i = Math.floor((lat - NULL_ISLAND.lat) / TILE_DEGREES);
  const j = Math.floor((lng - NULL_ISLAND.lng) / TILE_DEGREES);
  return { i, j };
}

//convert cell coordinates (i, j) to lat/lng bounds
function cellToBounds(i: number, j: number): leaflet.LatLngBounds {
  const southLat = NULL_ISLAND.lat + i * TILE_DEGREES;
  const westLng = NULL_ISLAND.lng + j * TILE_DEGREES;
  const northLat = southLat + TILE_DEGREES;
  const eastLng = westLng + TILE_DEGREES;
  return leaflet.latLngBounds([
    [southLat, westLng],
    [northLat, eastLng],
  ]);
}

function cellDistance(i1: number, j1: number, i2: number, j2: number): number {
  return Math.max(Math.abs(i1 - i2), Math.abs(j1 - j2));
}

//check if a cell is within interaction range of player
function isNearby(i: number, j: number): boolean {
  if (!movementStrategy) return false;
  const pos = movementStrategy.getCurrentPosition();
  return cellDistance(pos.i, pos.j, i, j) <= INTERACTION_RADIUS;
}

//initialize or get the state of a cell (Flyweight pattern: only store modified cells)
function getCellState(i: number, j: number): number | null {
  const key = getCellKey(i, j);

  if (modifiedCells.has(key)) {
    return cellStates.get(key)!;
  }

  if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
    return luck([i, j, "value"].toString()) < 0.5 ? 1 : 2;
  }
  return null;
}

function setCellState(i: number, j: number, value: number | null): void {
  const key = getCellKey(i, j);
  cellStates.set(key, value);
  modifiedCells.add(key);
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

function removeTokenLabel(i: number, j: number): void {
  const key = getCellKey(i, j);
  const label = cellLabels.get(key);
  if (label) {
    map.removeLayer(label);
    cellLabels.delete(key);
  }
}

//create or update token label for a cell
function createTokenLabel(i: number, j: number, value: number): void {
  const key = getCellKey(i, j);
  const rect = cellRects.get(key);
  if (!rect) return;

  removeTokenLabel(i, j);

  //create new label
  const bounds = rect.getBounds();
  const center = bounds.getCenter();
  const newLabel = leaflet.marker(center, {
    icon: leaflet.divIcon({
      className: "token-label",
      html:
        `<div style="font-size: 16px; font-weight: bold; color: #333; background: rgba(255,255,255,0.9); padding: 4px 8px; border-radius: 4px; border: 2px solid #333; pointer-events: none;">${value}</div>`,
      iconSize: [40, 40],
    }),
  });
  newLabel.addTo(map);
  cellLabels.set(key, newLabel);
}

// ==================== CELL RENDERING ====================

function clearCellVisuals(): void {
  // Remove all rectangles
  cellRects.forEach((rect) => map.removeLayer(rect));
  cellRects.clear();

  cellLabels.forEach((label) => map.removeLayer(label));
  cellLabels.clear();
}

function spawnCellsAroundPlayer(): void {
  if (!movementStrategy) return;
  const pos = movementStrategy.getCurrentPosition();
  for (let i = pos.i - NEIGHBORHOOD_SIZE; i < pos.i + NEIGHBORHOOD_SIZE; i++) {
    for (
      let j = pos.j - NEIGHBORHOOD_SIZE;
      j < pos.j + NEIGHBORHOOD_SIZE;
      j++
    ) {
      spawnCell(i, j);
    }
  }
}

//called when player position changes (from any movement strategy)
function onPlayerMoved(i: number, j: number): void {
  const bounds = cellToBounds(i, j);
  const center = bounds.getCenter();
  playerMarker.setLatLng(center);

  map.panTo(center);

  clearCellVisuals();
  spawnCellsAroundPlayer();

  saveGameState();
}

function spawnCell(i: number, j: number): void {
  const bounds = cellToBounds(i, j);

  const tokenValue = getCellState(i, j);
  const nearby = isNearby(i, j);
  const rect = leaflet.rectangle(bounds, {
    color: nearby ? "#3388ff" : "#888888",
    weight: 1,
    fillOpacity: nearby ? 0.2 : 0.1,
  });
  rect.addTo(map);

  //store the rectangle
  const key = getCellKey(i, j);
  cellRects.set(key, rect);

  //if cell has a token, display it
  if (tokenValue !== null) {
    createTokenLabel(i, j, tokenValue);
  }

  rect.on("click", () => {
    if (!nearby) {
      alert("Too far away! Move closer to interact with this cell.");
      return;
    }
    handleCellClick(i, j);
  });
}

function handleCellClick(i: number, j: number): void {
  const cellValue = getCellState(i, j);

  //case 1:cell has a token, player has no token -> Pick up
  if (cellValue !== null && heldToken === null) {
    heldToken = cellValue;
    setCellState(i, j, null);
    removeTokenLabel(i, j);
    updateStatus();
    saveGameState();
    return;
  }

  // Case 2: Cell is empty, player has a token -> Place down
  if (cellValue === null && heldToken !== null) {
    setCellState(i, j, heldToken);
    createTokenLabel(i, j, heldToken);
    heldToken = null;
    updateStatus();
    saveGameState();
    return;
  }

  //case 3:cell has token, player has token of same value -> Combine!
  if (cellValue !== null && heldToken !== null && cellValue === heldToken) {
    const newValue = cellValue * 2;
    setCellState(i, j, newValue);
    createTokenLabel(i, j, newValue);
    heldToken = null;
    updateStatus();
    saveGameState();
    return;
  }

  //case 4:cell has token, player has token of different value -> Can't combine
  if (cellValue !== null && heldToken !== null && cellValue !== heldToken) {
    alert(
      `Cannot combine! Cell has ${cellValue}, you have ${heldToken}. Values must match to combine.`,
    );
    return;
  }
}

// ==================== MOVEMENT CONTROL ====================

let currentMovementMode: "buttons" | "geolocation" = "buttons";

function initializeMovementStrategy(
  startPosition: { i: number; j: number },
): void {
  // Check URL query string for movement mode
  const params = new URLSearchParams(globalThis.location.search);
  const urlMode = params.get("movement");
  if (urlMode === "geolocation") {
    currentMovementMode = "geolocation";
  } else if (urlMode === "buttons") {
    currentMovementMode = "buttons";
  }

  if (movementStrategy) {
    movementStrategy.stopTracking();
  }

  if (currentMovementMode === "geolocation") {
    movementStrategy = new GeolocationMovementStrategy(startPosition);
    movementButtonsDiv.style.display = "none";
    modeToggleButton.textContent = "🎮 Switch to Buttons";
    modeIndicator.textContent = "Mode: Geolocation 📍";
  } else {
    movementStrategy = new ButtonMovementStrategy(startPosition);
    movementButtonsDiv.style.display = "flex";
    modeToggleButton.textContent = "📍 Switch to Geolocation";
    modeIndicator.textContent = "Mode: Buttons 🎮";
  }

  movementStrategy.startTracking(onPlayerMoved);
}

function toggleMovementMode(): void {
  const currentPos = movementStrategy?.getCurrentPosition() ||
    latLngToCell(CLASSROOM_LATLNG.lat, CLASSROOM_LATLNG.lng);

  currentMovementMode = currentMovementMode === "buttons"
    ? "geolocation"
    : "buttons";

  const params = new URLSearchParams(globalThis.location.search);
  params.set("movement", currentMovementMode);
  globalThis.history.replaceState(
    {},
    "",
    `${globalThis.location.pathname}?${params}`,
  );

  initializeMovementStrategy(currentPos);
}

// ==================== INITIALIZE GAME ====================

const hasSavedState = loadGameState();

let startPosition: { i: number; j: number };
if (hasSavedState) {
  const saved = JSON.parse(localStorage.getItem("gameState")!);
  startPosition = saved.playerPosition;
} else {
  startPosition = latLngToCell(CLASSROOM_LATLNG.lat, CLASSROOM_LATLNG.lng);
}

initializeMovementStrategy(startPosition);

const startBounds = cellToBounds(startPosition.i, startPosition.j);
const startCenter = startBounds.getCenter();
playerMarker.setLatLng(startCenter);
map.setView(startCenter, GAMEPLAY_ZOOM_LEVEL);

spawnCellsAroundPlayer();

updateStatus();

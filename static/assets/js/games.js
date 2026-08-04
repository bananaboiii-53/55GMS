let loadedImages = 0;
let failedImages = 0;
let loadingFadeTimer;
let loadingHideTimer;
let imageLoadTimeout;
const pendingImageSettlers = new Set();

window.addEventListener("load", () => {
  document.getElementById("retry-games")?.addEventListener("click", loadGames);
  loadGames();
});

async function loadGames() {
  const gameContainer = document.getElementById("game-container");
  const loadingContainer = document.getElementById("loading-container");
  const progressBar = document.getElementById("progress-bar");
  const progressPercentage = document.getElementById("progress-percentage");
  const loadingText = document.getElementById("loading-text");
  const retryButton = document.getElementById("retry-games");

  clearTimeout(loadingFadeTimer);
  clearTimeout(loadingHideTimer);
  clearTimeout(imageLoadTimeout);
  pendingImageSettlers.clear();
  loadedImages = 0;
  failedImages = 0;
  gameContainer.replaceChildren();
  loadingContainer.style.display = "flex";
  loadingContainer.style.opacity = "1";
  loadingText.textContent = "Loading games…";
  progressBar.style.width = "0%";
  progressBar.setAttribute("aria-valuenow", "0");
  progressPercentage.textContent = "0%";
  retryButton.hidden = true;

  try {
    const response = await fetch("/assets/json/load/g.json");
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const games = await response.json();
    games.sort((a, b) => a.name.localeCompare(b.name));

    const cards = games.map(createGameCard).filter(Boolean);
    const totalImages = cards.length;
    const fragment = document.createDocumentFragment();

    loadingText.textContent = `Loading ${totalImages} games…`;

    cards.forEach(({ card, image, imageUrl }) => {
      const settleImage = (failed) => {
        if (!pendingImageSettlers.delete(settleImage)) return;
        if (failed) card.classList.add("game-image-error");
        handleImageSettled(totalImages, failed);
      };

      pendingImageSettlers.add(settleImage);
      image.addEventListener("load", () => settleImage(false), { once: true });
      image.addEventListener("error", () => settleImage(true), { once: true });
      image.src = imageUrl;
      fragment.appendChild(card);
    });

    imageLoadTimeout = setTimeout(() => {
      [...pendingImageSettlers].forEach((settleImage) => settleImage(true));
    }, 20000);

    gameContainer.appendChild(fragment);

    const searchbar = document.querySelector(".searchbar");
    if (searchbar) {
      searchbar.placeholder = `Click here or type to search through our ${games.length} games!`;
    }

    if (totalImages === 0) {
      finishLoading();
    }
  } catch (error) {
    loadingText.textContent =
      "Unable to load games. Check your connection and try again.";
    progressPercentage.textContent = "Load failed";
    retryButton.hidden = false;
    console.error("Error loading games:", error);
  }
}

function createGameCard(game) {
  const card = document.createElement("div");
  card.className = "game";

  let control;
  if (game.usesProxy) {
    control = document.createElement("button");
    control.type = "button";
    control.addEventListener("click", () => {
      if (game.alert) window.alert(game.alert);
      hire(game.url);
    });
  } else {
    let href = game.url;
    if (game.author && !game.url) {
      const gameLink = game.image.split("/").filter(Boolean).at(-2);
      href = `/misc/play/?title=${encodeURIComponent(
        game.name,
      )}&author=${encodeURIComponent(game.author)}&link=${encodeURIComponent(
        gameLink,
      )}`;
    }

    if (!href) return null;

    control = document.createElement("a");
    control.href = href;
    control.rel = "noopener noreferrer";
    if (game.alert) {
      control.addEventListener("click", () => window.alert(game.alert));
    }
  }

  control.className = "game-link";

  const image = document.createElement("img");
  image.alt = "";
  image.width = 175;
  image.height = 175;
  image.loading = "eager";

  const label = document.createElement("p");
  label.className = "text";
  label.textContent = game.name;

  control.append(image, label);
  card.appendChild(control);

  return { card, image, imageUrl: game.image };
}

function handleImageSettled(totalImages, failed) {
  loadedImages++;
  if (failed) failedImages++;

  const percentage = Math.round((loadedImages / totalImages) * 100);
  const progressBar = document.getElementById("progress-bar");
  const progressPercentage = document.getElementById("progress-percentage");
  const loadingText = document.getElementById("loading-text");

  progressBar.style.width = `${percentage}%`;
  progressBar.setAttribute("aria-valuenow", String(percentage));
  progressPercentage.textContent = `${percentage}%`;
  loadingText.textContent = `Loading games… (${loadedImages}/${totalImages})`;

  if (loadedImages >= totalImages) {
    finishLoading();
  }
}

function finishLoading() {
  const loadingContainer = document.getElementById("loading-container");
  const loadingText = document.getElementById("loading-text");

  clearTimeout(imageLoadTimeout);

  loadingText.textContent = failedImages
    ? `${failedImages} thumbnails unavailable. Games are ready.`
    : "All games loaded!";

  loadingFadeTimer = setTimeout(() => {
    loadingContainer.style.opacity = "0";
    loadingHideTimer = setTimeout(() => {
      loadingContainer.style.display = "none";
    }, 500);
  }, 800);
}

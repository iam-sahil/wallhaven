import { getNextApiKey } from './pixabaykeys.js';
// --------------------- MAIN CODE ---------------------
document.addEventListener("DOMContentLoaded", () => {
  gsap.from(".title", { duration: 1, opacity: 0, y: -50, ease: "power2.out" });
  gsap.from(".image-grid", { duration: 1, opacity: 0, y: -20, ease: "power2.out", delay: 0.25 });
  const grid = document.getElementById("favouritesGrid");
  if (!grid) {
    return;
  }
  
  // Retrieve favourites from localStorage (should be an array of objects)
  let favourites = JSON.parse(localStorage.getItem("favourites") || "[]");  
  if (favourites.length === 0) {
    grid.innerHTML = "<p style='color: var(--text-color); text-align: center;'>No favourites yet.</p>";
    return;
  }
  
  // Render each favourite item
  favourites.forEach(item => {
    if (item.isFull) {
      renderFavouriteItem(item.data, grid);
    } else {
      // For minimal entries, fetch the full data using the stored image ID.
      fetchFullImageData(item.id)
        .then(fullData => {
          renderFavouriteItem(fullData, grid);
        })
        .catch(err => {
          console.error("Error fetching image details for id " + item.id, err);
        });
    }
  });
  
  // Back Home Button
  const backHomeBtn = document.getElementById("backHomeBtn");
  if (backHomeBtn) {
    backHomeBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  } else {
    console.error("Back Home button with id 'backHomeBtn' not found!");
  }
});

// Render a single favourite item in the grid
function renderFavouriteItem(image, container) {
  const favContainer = document.createElement("div");
  favContainer.classList.add("img-container");

  // Create and set up the image element
  const img = document.createElement("img");
  img.src = image.webformatURL;
  img.alt = image.tags || "Favourite image";
  favContainer.appendChild(img);

  // Download button
  const downloadLink = document.createElement("a");
  downloadLink.classList.add("download-btn");
  downloadLink.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" 
         fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/>
      <path d="m14 19 3 3v-5.5"/>
      <path d="m17 22 3-3"/>
      <circle cx="9" cy="9" r="2"/>
    </svg>`;
  downloadLink.href = image.largeImageURL || image.webformatURL;
  downloadLink.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleDownload(e, image);
  });
  favContainer.appendChild(downloadLink);

  // Favourite (Remove) button with hover effect
  const favouriteBtn = document.createElement("button");
  favouriteBtn.classList.add("favourite-btn");
  favouriteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  `;

  favouriteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    removeFavourite(image.id);
    gsap.to(favContainer, {
      duration: 0.5,
      opacity: 0,
      scale: 0.95,
      ease: "back.in(1.7)",
      onComplete: () => favContainer.remove()
    });
    showToast("Image removed from favourites!");
  });
  favContainer.appendChild(favouriteBtn);

  container.appendChild(favContainer);
  
  if (typeof gsap !== "undefined") {
    gsap.from(favContainer, { duration: 0.5, opacity: 0, scale: 0.95, ease: "back.out(1.7)" });
  }
}

function fetchFullImageData(imageId) {
  // Use the API key cycling logic here
  const apiKey = getNextApiKey();
  const url = `https://pixabay.com/api/?key=${apiKey}&id=${imageId}`;
  return fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.hits && data.hits.length > 0) {
        return data.hits[0];
      } else {
        removeFavourite(imageId);
        throw new Error("No data found for image ID " + imageId);
      }
    });
}

async function handleDownload(e, image) {
  e.stopPropagation();
  e.preventDefault();
  const imageUrl = image.largeImageURL || image.webformatURL;
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const objectURL = URL.createObjectURL(blob);
    const tempLink = document.createElement("a");
    tempLink.href = objectURL;
    
    // Determine file extension from the URL.
    let extension = "jpg"; // default extension if none found
    const urlParts = imageUrl.split(".");
    if (urlParts.length > 1) {
      extension = urlParts[urlParts.length - 1].split("?")[0];
    }
    
    // Build a custom filename using the image id (or any other property)
    tempLink.download = `wallhaven-${image.id}.${extension}`;
    
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
    URL.revokeObjectURL(objectURL);
    showToast("Thank you for downloading!");
  } catch (error) {
    showToast("Unable to download the image.");
  }
}


function removeFavourite(imageId) {
  let favourites = JSON.parse(localStorage.getItem("favourites") || "[]");
  favourites = favourites.filter(fav =>
    fav.isFull ? fav.data.id !== imageId : fav.id !== imageId
  );
  localStorage.setItem("favourites", JSON.stringify(favourites));
}

function showToast(message) {
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastContainer.appendChild(toast);
  if (typeof gsap !== "undefined") {
    gsap.to(toast, { opacity: 1, duration: 0.5 });
  } else {
    toast.style.opacity = 1;
  }
  setTimeout(() => {
    if (typeof gsap !== "undefined") {
      gsap.to(toast, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
          toastContainer.removeChild(toast);
        }
      });
    } else {
      toast.style.opacity = 0;
      setTimeout(() => {
        toastContainer.removeChild(toast);
      }, 500);
    }
  }, 2000);
}

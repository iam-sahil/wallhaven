# Wall Haven Wallpaper Search

Wall Haven Wallpaper Search is a responsive wallpaper website that allows you to search for high‑quality wallpapers using the Pixabay API. The site features a dynamic masonry grid layout, infinite scrolling, smooth animations, and the ability to download and save your favorite wallpapers locally.

## Homepage
![screenshot](wall_haven_home.png)

## Favourites Page 
![screenshot](wall_haven_fav.png)

## Features

- **Wallpaper Search:**  
  Search for wallpapers by keyword using the Pixabay API.

- **Infinite Scrolling:**  
  Automatically loads more wallpapers as you scroll down the page.

- **Masonry Grid Layout:**  
  Displays images in a visually appealing, Pinterest‑style layout.

- **Image Download:**  
  Download wallpapers with a custom file name format.

- **Favorites:**  
  Save your favorite wallpapers to localStorage and view them on a dedicated Favorites page.

- **Smooth Animations:**  
  Powered by GSAP for animated transitions and effects.

- **Typewriter Effect:**  
  A dynamic typewriter animation for the search bar placeholder.

## Dependencies

- **Pixabay API Keys**
- **GSAP for animations**
- **ScrollToPlugin for smooth scrolling**


## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/iam-sahil/wall_haven
   ```
2. **Change directory**
   ```bash
   cd wall_haven
   ```
2. **Change directory**
   ```bash
   cd js
   ```
3. **Create the file pixabaykeys.js**
   ```bash
    export const apiKeys = [
        'key-1',
        'key-2',
    ];

    let currentKeyIndex = 0;

    export function getNextApiKey() {
        const key = apiKeys[currentKeyIndex];
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
        return key;
    }
   ```
4. **Launch**
   ```bash
   Simply run index.html in a browser
   ```

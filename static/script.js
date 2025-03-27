document.addEventListener("DOMContentLoaded", function() {
  // Initialize socket connection
  const socket = io();
  
  // Function to go to genre selection
  window.goToGenreSelection = function() {
      document.getElementById('genre-selection').scrollIntoView({ behavior: 'smooth' });
  };
  
  // Function to search projects based on user input
  window.searchProjects = function(query) {
      fetch('/search', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query })
      })
      .then(response => response.json())
      .then(projects => {
          const projectContainer = document.getElementById('projects');
          projectContainer.innerHTML = '';
          projects.forEach(project => {
              const projectCard = document.createElement('div');
              projectCard.className = 'project-card';
              projectCard.innerHTML = `
                  <h3>${project.title}</h3>
                  <p>Genre: ${project.genre}</p>
                  <p>Description: ${project.description}</p>
              `;
              projectContainer.appendChild(projectCard);
          });
      });
  };
  
  // Lazy loading for images
  let lazyImages = [].slice.call(document.querySelectorAll("img.lazy-load"));
  
  if ("IntersectionObserver" in window) {
      let lazyImageObserver = new IntersectionObserver(function(entries, observer) {
          entries.forEach(function(entry) {
              if (entry.isIntersecting) {
                  let lazyImage = entry.target;
                  lazyImage.src = lazyImage.dataset.src;
                  lazyImage.classList.remove("lazy-load");
                  lazyImageObserver.unobserve(lazyImage);
              }
          });
      });
      
      lazyImages.forEach(function(lazyImage) {
          lazyImageObserver.observe(lazyImage);
      });
  }
  
  // Helper function to get room code from URL
  function getRoomCodeFromUrl() {
      // Assuming URL format is /room/ROOM_CODE
      const pathParts = window.location.pathname.split('/');
      return pathParts[pathParts.length - 1];
  }
  
  // Function to join room
  function joinRoom(username, roomCode) {
      socket.emit('join', {
          username: username,
          room: roomCode
      });
  }
  
  // Check if we're on a room page by looking for the join form
  const joinForm = document.getElementById('join-form');
  if (joinForm) {
      // When the user initially enters their username
      joinForm.addEventListener('submit', function(e) {
          e.preventDefault();
          const username = document.getElementById('username-input').value.trim();
          const roomCode = getRoomCodeFromUrl();
          
          // Save the username in localStorage with the room code as part of the key
          localStorage.setItem(`username_${roomCode}`, username);
          
          // Join the room with the username
          joinRoom(username, roomCode);
      });
      
      // When the page loads, check for saved username
      const roomCode = getRoomCodeFromUrl();
      const savedUsername = localStorage.getItem(`username_${roomCode}`);
      
      if (savedUsername) {
          // Auto-join with saved username
          joinRoom(savedUsername, roomCode);
          // Hide the username prompt
          const usernamePrompt = document.getElementById('username-prompt');
          if (usernamePrompt) {
              usernamePrompt.style.display = 'none';
          }
      } else {
          // Show the username prompt
          const usernamePrompt = document.getElementById('username-prompt');
          if (usernamePrompt) {
              usernamePrompt.style.display = 'block';
          }
      }
  }
});
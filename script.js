
document.addEventListener('DOMContentLoaded', function() {
    // Feature selection and main app transition
    const startAppBtn = document.getElementById('start-app-btn');
    const featureSelection = document.getElementById('feature-selection');
    const mainApp = document.getElementById('main-app');
    const homeLink = document.querySelector('.nav-link.home-link');

    // Home link click handler
    if (homeLink) {
        homeLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (featureSelection && mainApp) {
                featureSelection.style.display = 'flex';
                mainApp.style.display = 'none';
            }
        });
    }

    // Initialize main app as hidden
    if (mainApp) mainApp.style.display = 'none';
    if (featureSelection) featureSelection.style.display = 'flex';
    
    // Home link handling
    if (homeLink) {
        homeLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (featureSelection && mainApp) {
                mainApp.style.display = 'none';
                featureSelection.style.display = 'flex';
                mainApp.style.display = 'none';
            }
        });
    }

    // Start app button handling
    if (startAppBtn) {
        startAppBtn.addEventListener('click', function() {
            const selectedFeatures = {
                videoAnalysis: document.getElementById('select-video-analysis')?.checked || false,
                imageAnalysis: document.getElementById('select-image-analysis')?.checked || false,
                gpsAnalysis: document.getElementById('select-gps-analysis')?.checked || false,
                threeDVisualization: document.getElementById('select-3d-visualization')?.checked || false
            };

            if (featureSelection && mainApp) {
                featureSelection.style.display = 'none';
                mainApp.style.display = 'block';
                
                // Update visibility of sections based on selections
                const videoSection = document.getElementById('video-analysis');
                const imageSection = document.getElementById('image-analysis');
                const gpsSection = document.getElementById('gps-analysis');
                const threeDContainer = document.getElementById('terrain-3d-container');
                
                if (videoSection) videoSection.style.display = selectedFeatures.videoAnalysis ? 'block' : 'none';
                if (imageSection) imageSection.style.display = selectedFeatures.imageAnalysis ? 'block' : 'none';
                if (gpsSection) gpsSection.style.display = selectedFeatures.gpsAnalysis ? 'block' : 'none';
                if (threeDContainer) threeDContainer.style.display = selectedFeatures.threeDVisualization ? 'block' : 'none';
            }
        });
    }

    // Dark mode toggle functionality
    const themeToggle = document.getElementById('theme-toggle-input');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    // Function to set theme
    function setTheme(isDark) {
        if (isDark) {
            document.body.classList.add('dark-mode');
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            if (themeToggle) themeToggle.checked = true;
            document.querySelector('.theme-toggle-icon.light-icon').style.color = '#999';
            document.querySelector('.theme-toggle-icon.dark-icon').style.color = '#fff';
        } else {
            document.body.classList.remove('dark-mode');
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            if (themeToggle) themeToggle.checked = false;
            document.querySelector('.theme-toggle-icon.light-icon').style.color = '#ff9800';
            document.querySelector('.theme-toggle-icon.dark-icon').style.color = '#999';
        }
    }

    // Initialize theme based on local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        setTheme(true);
    } else if (savedTheme === 'light') {
        setTheme(false);
    } else {
        // If no saved preference, use system preference
        setTheme(prefersDarkScheme.matches);
    }

    // Toggle theme when switch is clicked
    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            setTheme(this.checked);
        });
    }

    // Listen for system preference changes
    prefersDarkScheme.addEventListener('change', function(e) {
        if (!localStorage.getItem('theme')) {
            setTheme(e.matches);
        }
    });
});

// When the DOM content is loaded, execute this function
document.addEventListener("DOMContentLoaded", function() {
    // Get the dark mode switch element by its ID
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    // Get the HTML element
    const htmlElement = document.documentElement;

    // Function to set a cookie
    function setCookie(name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "")  + expires + "; path=/";
    }
    
    // Function to get a cookie
    function getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
    
    // Function to initialize dark mode based on the saved preference
    function initializeDarkMode() {
        const darkMode = getCookie('darkMode') === 'enabled';
        // Toggle dark mode class on the body
        document.body.classList.toggle('dark-mode', darkMode);
        // Set the state of the dark mode switch
        darkModeSwitch.checked = darkMode;
        // Set background color based on dark mode state
        if (darkMode) {
            htmlElement.style.backgroundColor = "#121212";
        } else {
            htmlElement.style.backgroundColor = "#e5e2e2";
        }
    }
    
    // Function to toggle dark mode
    function toggleDarkMode() {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        // Set dark mode preference in the cookie
        setCookie('darkMode', isDarkMode ? 'enabled' : 'disabled', 30);
        // Set background color based on dark mode state
        if (isDarkMode) {
            htmlElement.style.backgroundColor = "#121212";
        } else {
            htmlElement.style.backgroundColor = "#e5e2e2";
        }
    }
    
    // Initialize dark mode when the page loads
    initializeDarkMode();
    
    // Add event listener to the dark mode switch
    darkModeSwitch.addEventListener('change', function() {
        // Toggle dark mode when the switch is changed
        toggleDarkMode();
    });
});
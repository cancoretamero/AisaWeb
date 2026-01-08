/*
 * Theme toggle logic shared across public pages.
 * Keeps icon state in sync with the active HTML class.
 */
(function() {
    const htmlElement = document.documentElement;
    const themeToggleBtn = document.getElementById('theme-toggle');

    if (!themeToggleBtn) return;

    const sunIcon = themeToggleBtn.querySelector('.fa-sun');
    const moonIcon = themeToggleBtn.querySelector('.fa-moon');

    const updateIcons = () => {
        const isDark = htmlElement.classList.contains('dark');
        if (sunIcon) {
            sunIcon.classList.toggle('hidden', isDark);
            sunIcon.classList.toggle('block', !isDark);
        }
        if (moonIcon) {
            moonIcon.classList.toggle('hidden', !isDark);
            moonIcon.classList.toggle('block', isDark);
        }
    };

    updateIcons();

    themeToggleBtn.addEventListener('click', () => {
        htmlElement.classList.toggle('dark');
        localStorage.theme = htmlElement.classList.contains('dark') ? 'dark' : 'light';
        updateIcons();
    });
})();

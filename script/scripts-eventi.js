document.querySelectorAll('.storyline-wrapper .slider-card.is-active .slider-content h3').forEach(function(element) {
    element.style.backgroundColor = '#5593C9';
});

document.querySelectorAll('.storyline-wrapper circle[class^="marker"].is-active').forEach(function(element) {
    element.style.fill = '#5593C9';
    element.style.borderColor = '#5593C9';
    element.style.stroke = '#5593C9';
});

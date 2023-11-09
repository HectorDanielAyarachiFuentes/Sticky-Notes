// Create stack of sticky notes
const board = document.querySelector("#board")
for (let i = 0; i < 100; i++) {
  const sticky = document.createElement("div");
  sticky.classList.add("stickynote");
  
  const text = document.createElement("textarea");
  text.type = "text";
  text.placeholder = "Drag Me";
  text.maxLength = 100;
  text.classList.add("stickynote-text");
  
  sticky.appendChild(text);
  
  board.appendChild(sticky);
}

// Dynamically change height of textarea
document.querySelectorAll('textarea').forEach(textarea => {
  function setHeight() {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
  setHeight();
  textarea.addEventListener('input', setHeight);
  textarea.addEventListener('change', setHeight);
});

// Make list of draggable sticky notes
// Also add some cool adjustments that make it respond to speed of drag
// If you are reading this you can actually place stickies with an angle if you do it fast enough ;)
const draggables = Draggable.create(".stickynote", {
  type: "x,y",
  onDragStart: function () {
    // InertiaPlugin.track(this.target, "x"); // Remove this line
    grabNoteAnimation(this.target);
    const inputField = this.target.querySelector('.stickynote-text');
    inputField.placeholder = "Stick Me";
  },
  onDrag: function () {
    // Remove the InertiaPlugin related code in this section
    // ...
  },
  onDragEnd: function () {
    releaseNoteAnimation(this.target);
    const inputField = this.target.querySelector('.stickynote-text');
    inputField.placeholder = "Write On Me";
  },
  dragClickables: false,
});

// Rotates backward on X axis and changes scale to appear like it is being ripped up
function grabNoteAnimation(target) {
  // ...
}

// Does the reverse of the previous function with a few different modifications to stick back down
function releaseNoteAnimation(target) {
  // ...
}

// Fixes weirdness of typing on text box and dragging
document.querySelectorAll(".stickynote-text").forEach((textField) => {
  textField.addEventListener("focus", () => {
    draggables.forEach((instance) => {
      if (instance.target.contains(textField)) {
        instance.disable();
      }
    });
  });
  
  textField.addEventListener("blur", () => {
    draggables.forEach((instance) => {
      if (instance.target.contains(textField)) {
        instance.enable();
      }
    });
  });
});

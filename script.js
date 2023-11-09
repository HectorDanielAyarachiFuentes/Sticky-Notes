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
    InertiaPlugin.track(this.target, "x");
    grabNoteAnimation(this.target);
    const inputField = this.target.querySelector('.stickynote-text');
    inputField.placeholder = "Stick Me";
  },
  onDrag: function () {
    let dx = InertiaPlugin.getVelocity(this.target, "x");
      gsap.to(this.target, {
        rotation: dx * -0.003,
        duration: 0.5,
        ease: "elastic.out(1.8, 0.6)",
        onComplete: function () {
          gsap.to(this.target, {
            rotation: 0,
            duration: 0.5,
            ease: "elastic.out(1.8, 0.6)"
          });
        }
      });
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
  const timeline = gsap.timeline();
  timeline
    .to(target, {
      rotateX: 30,
      boxShadow: "-1px 14px 40px -4px rgba(0, 0, 0, 0.12), inset 0 14px 20px -12px rgba(0, 0, 0, 0.3)",
      duration: 0.3
    })
    .to(target, {
      rotation: 0,
      rotateX: 5,
      scale: 1.1,
      boxShadow: "-1px 14px 40px -4px rgba(0, 0, 0, 0.12), inset 0 24px 30px -12px rgba(0, 0, 0, 0.3)",
      ease: "elastic.out(0.8, 0.5)"
    }, 0.15);
  timeline.play();
}

// Does the reverse of the previous function with a few different modifications to stick back down
function releaseNoteAnimation(target) {
  const timeline = gsap.timeline();
  timeline
    .to(target, {
      rotateX: 30,
      boxShadow: "-1px 10px 5px -4px rgba(0, 0, 0, 0.2), inset 0 24px 30px -12px rgba(0, 0, 0, 0.3)",
      duration: 0.3
    })
    .to(target, {
      scale: 1
    }, 0)
    .to(target, {
      rotateX: 5,
      boxShadow: "-1px 10px 5px -4px rgba(0, 0, 0, 0.2), inset 0 24px 30px -12px rgba(0, 0, 0, 0.3)",
      ease: "elastic.out(0.8, 0.5)"
    }, 0.2);
  timeline.play();
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
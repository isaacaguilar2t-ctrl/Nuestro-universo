(function () {
  "use strict";

  if (!window.THREE) {
    return;
  }

  var SETTINGS = {
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    heartParticles: 15000,
    coreParticles: 3800,
    dustParticles: 3200
  };

  var PHRASES = [
    "te amo",
    "siempre te amar\u00e9",
    "eres mi universo",
    "mi coraz\u00f3n siempre ser\u00e1 tuyo",
    "amor infinito"
  ];

  var HIDDEN_PHRASES = [
    "aqu\u00ed te encontr\u00e9...",
    "este momento nunca se repiti\u00f3...",
    "dos almas en el universo..."
  ];

  var scene;
  var camera;
  var renderer;
  var controls;
  var clock;
  var textureLoader;
  var universe;
  var starRoot;
  var heartGroup;
  var dustGroup;
  var photoLayer;
  var textLayer;
  var heart;
  var heartCore;
  var heartHalo;
  var dust;
  var stars = [];
  var updatables = [];
  var floatingTexts = [];
  var mouse = { x: 10, y: 10, active: false };
  var projectedHeart = new THREE.Vector3();
  var heartHover = 0;
  var introProgress = 0;
  var formationComplete = false;
  var nextPhraseAt = 12;
  var nextHiddenAt = 28;
  var phraseIndex = 0;
  var hiddenIndex = 0;
  var finalMessageShown = false;
  var cameraStart = new THREE.Vector3(0, 180, 2300);
  var cameraMid = new THREE.Vector3(0, 112, 1320);
  var cameraTarget = new THREE.Vector3(0, 22, 0);
  var desiredCamera = new THREE.Vector3();
  var desiredTarget = new THREE.Vector3();
  var audioState = { started: false, beat: 0, energy: 0, beatCount: 0 };
  var musicEngine;

  init();
  animate();

  function init() {
    removePreviousCanvas();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x030005, 0.00022);

    camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      8000
    );
    camera.position.copy(cameraStart);
    camera.lookAt(cameraTarget);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.domElement.id = "universo-canvas";
    renderer.setClearColor(0x000000, 1);
    renderer.setPixelRatio(SETTINGS.pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (THREE.sRGBEncoding) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }
    document.body.appendChild(renderer.domElement);

    clock = new THREE.Clock();
    textureLoader = new THREE.TextureLoader();
    musicEngine = createMusicEngine();

    universe = new THREE.Group();
    starRoot = new THREE.Group();
    heartGroup = new THREE.Group();
    dustGroup = new THREE.Group();
    photoLayer = new THREE.Group();
    textLayer = new THREE.Group();

    universe.add(heartGroup);
    universe.add(dustGroup);
    scene.add(starRoot);
    scene.add(universe);
    scene.add(photoLayer);
    scene.add(textLayer);

    setupControls();
    createVisualLayers();
    setupEvents();
    createMusicButton();
    updateInterfaceText("Creando nuestro universo...");
    exposeApi();
  }

  function removePreviousCanvas() {
    var previousCanvas = document.getElementById("universo-canvas");
    if (previousCanvas && previousCanvas.parentNode) {
      previousCanvas.parentNode.removeChild(previousCanvas);
    }
  }

  function setupControls() {
    if (!THREE.OrbitControls) {
      return;
    }

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(cameraTarget);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.rotateSpeed = 0.42;
    controls.zoomSpeed = 0.72;
    controls.panSpeed = 0.45;
    controls.minDistance = 360;
    controls.maxDistance = 2300;
    controls.autoRotate = false;
    controls.enabled = false;
  }

  function createVisualLayers() {
    var heartTexture = createRadialTexture(
      96,
      "rgba(255,170,215,0.92)",
      "rgba(255,45,145,0.46)",
      "rgba(255,0,60,0)"
    );
    var starTexture = createRadialTexture(
      64,
      "rgba(255,255,255,0.95)",
      "rgba(255,225,240,0.48)",
      "rgba(255,255,255,0)"
    );

    createStarField(starTexture);
    heartHalo = createHeartHalo();
    heart = createHeartParticles(heartTexture);
    heartCore = createHeartCore(heartTexture);
    dust = createCosmicDust(heartTexture);

    heartGroup.add(heartHalo);
    heartGroup.add(heart);
    heartGroup.add(heartCore);
    dustGroup.add(dust);
  }

  function setupEvents() {
    renderer.domElement.addEventListener("pointermove", onPointerMove, { passive: true });
    renderer.domElement.addEventListener("pointerleave", onPointerLeave, { passive: true });
    window.addEventListener("resize", onResize);
  }

  function exposeApi() {
    window.NuestroUniverso = {
      scene: scene,
      camera: camera,
      renderer: renderer,
      controls: controls,
      universe: universe,
      heartGroup: heartGroup,
      photoLayer: photoLayer,
      textLayer: textLayer,
      audioState: audioState,
      textureLoader: textureLoader,
      addUpdatable: addUpdatable,
      showMemory: showFloatingText
    };

    window.dispatchEvent(new CustomEvent("nuestro-universo-ready"));
  }

  function createMusicButton() {
    var button = document.createElement("button");

    button.type = "button";
    button.textContent = "Click para iniciar el piano";
    button.style.position = "fixed";
    button.style.left = "50%";
    button.style.bottom = "28px";
    button.style.transform = "translateX(-50%)";
    button.style.zIndex = "12";
    button.style.border = "1px solid rgba(255,120,170,0.42)";
    button.style.background = "rgba(10,0,8,0.62)";
    button.style.color = "rgba(255,245,250,0.96)";
    button.style.padding = "10px 16px";
    button.style.borderRadius = "999px";
    button.style.font = "14px Arial, sans-serif";
    button.style.cursor = "pointer";
    button.style.boxShadow = "0 0 18px rgba(255,90,150,0.2)";
    button.style.transition = "opacity 700ms ease, transform 700ms ease";
    document.body.appendChild(button);

    button.addEventListener("click", function () {
      if (musicEngine.start()) {
        updateInterfaceText("El universo est\u00e1 despertando...");
        button.style.opacity = "0";
        button.style.transform = "translateX(-50%) translateY(8px)";
        setTimeout(function () {
          if (button.parentNode) {
            button.parentNode.removeChild(button);
          }
        }, 800);
      }
    });
  }

  function createMusicEngine() {
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    var context = null;
    var master = null;
    var pianoBus = null;
    var padGain = null;
    var delay = null;
    var feedback = null;
    var delayFilter = null;
    var oscillators = [];
    var started = false;
    var beatTimer = null;
    var melodyTimer = null;
    var chordTimer = null;
    var beatTime = -10;
    var beatCount = 0;
    var chordIndex = 0;
    var melodyIndex = 0;
    var progression = [
      {
        pad: [130.81, 164.81, 196.0, 261.63],
        melody: [392.0, 523.25, 587.33, 659.25, 587.33, 523.25, 392.0, 329.63]
      },
      {
        pad: [146.83, 174.61, 220.0, 293.66],
        melody: [440.0, 587.33, 659.25, 698.46, 659.25, 587.33, 440.0, 349.23]
      },
      {
        pad: [110.0, 146.83, 174.61, 220.0],
        melody: [349.23, 440.0, 523.25, 587.33, 523.25, 440.0, 349.23, 293.66]
      },
      {
        pad: [98.0, 130.81, 164.81, 246.94],
        melody: [329.63, 392.0, 493.88, 523.25, 493.88, 392.0, 329.63, 261.63]
      }
    ];

    function start() {
      if (started) {
        return false;
      }

      started = true;
      audioState.started = true;

      if (!AudioContextClass) {
        triggerBeat();
        beatTimer = window.setInterval(triggerBeat, 960);
        return true;
      }

      context = new AudioContextClass();
      if (context.state === "suspended" && context.resume) {
        context.resume();
      }

      master = context.createGain();
      pianoBus = context.createGain();
      padGain = context.createGain();
      delay = context.createDelay(2.5);
      feedback = context.createGain();
      delayFilter = context.createBiquadFilter();

      master.gain.value = 0.0001;
      pianoBus.gain.value = 0.16;
      padGain.gain.value = 0.055;
      delay.delayTime.value = 0.34;
      feedback.gain.value = 0.24;
      delayFilter.type = "lowpass";
      delayFilter.frequency.value = 2400;

      pianoBus.connect(master);
      pianoBus.connect(delay);
      delay.connect(delayFilter);
      delayFilter.connect(feedback);
      feedback.connect(delay);
      delayFilter.connect(master);
      padGain.connect(master);
      master.connect(context.destination);

      createPads();
      master.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 2.1);
      triggerBeat();
      playPianoPhrase();
      beatTimer = window.setInterval(triggerBeat, 960);
      melodyTimer = window.setInterval(playPianoPhrase, 480);
      chordTimer = window.setInterval(nextChord, 7680);
      return true;
    }

    function createPads() {
      var chord = progression[chordIndex].pad;
      var i;
      var osc;
      var gain;

      for (i = 0; i < chord.length; i += 1) {
        osc = context.createOscillator();
        gain = context.createGain();
        osc.type = i % 2 === 0 ? "sine" : "triangle";
        osc.frequency.value = chord[i];
        gain.gain.value = 0.012 + i * 0.004;
        osc.connect(gain);
        gain.connect(padGain);
        osc.start();
        oscillators.push({ osc: osc, octave: i === chord.length - 1 ? 2 : 1 });
      }
    }

    function nextChord() {
      var chord;
      var now;
      var i;

      if (!context) {
        return;
      }

      chordIndex = (chordIndex + 1) % progression.length;
      chord = progression[chordIndex].pad;
      now = context.currentTime;

      for (i = 0; i < oscillators.length; i += 1) {
        oscillators[i].osc.frequency.cancelScheduledValues(now);
        oscillators[i].osc.frequency.linearRampToValueAtTime(chord[i] * oscillators[i].octave, now + 2.4);
      }
    }

    function triggerBeat() {
      beatTime = performance.now() * 0.001;
      beatCount += 1;

      if (context) {
        playSoftPulse(context.currentTime);
        if (beatCount % 4 === 0) {
          playPianoNote(progression[chordIndex].pad[0], context.currentTime + 0.02, 0.08, 1.4);
        }
      }
    }

    function playPianoPhrase() {
      var chord;
      var note;
      var now;

      if (!context) {
        return;
      }

      chord = progression[chordIndex];
      note = chord.melody[melodyIndex % chord.melody.length];
      now = context.currentTime;
      playPianoNote(note, now, melodyIndex % 4 === 0 ? 0.16 : 0.11, 1.65);

      if (melodyIndex % 8 === 0) {
        playPianoNote(chord.pad[0], now + 0.01, 0.1, 2.2);
        playPianoNote(chord.pad[2], now + 0.025, 0.055, 2.1);
      }

      melodyIndex += 1;
    }

    function playPianoNote(frequency, time, velocity, duration) {
      var osc = context.createOscillator();
      var overtone = context.createOscillator();
      var gain = context.createGain();
      var overtoneGain = context.createGain();
      var filter = context.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(4200, time);
      filter.frequency.exponentialRampToValueAtTime(900, time + duration);
      osc.type = "triangle";
      overtone.type = "sine";
      osc.frequency.setValueAtTime(frequency, time);
      overtone.frequency.setValueAtTime(frequency * 2.01, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, velocity), time + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      overtoneGain.gain.setValueAtTime(0.0001, time);
      overtoneGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, velocity * 0.25), time + 0.012);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.74);

      osc.connect(gain);
      overtone.connect(overtoneGain);
      gain.connect(filter);
      overtoneGain.connect(filter);
      filter.connect(pianoBus);
      osc.start(time);
      overtone.start(time);
      osc.stop(time + duration + 0.05);
      overtone.stop(time + duration + 0.05);
    }

    function playSoftPulse(time) {
      var osc = context.createOscillator();
      var gain = context.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(65.41, time);
      osc.frequency.exponentialRampToValueAtTime(49.0, time + 0.18);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.035, time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.48);
      osc.connect(gain);
      gain.connect(master);
      osc.start(time);
      osc.stop(time + 0.52);
    }

    function update() {
      var age = Math.max(0, performance.now() * 0.001 - beatTime);

      audioState.started = started;
      audioState.beat = started ? Math.max(0, 1 - age / 0.22) : 0;
      audioState.energy = started ? Math.exp(-age * 2.7) : 0;
      audioState.beatCount = beatCount;
      return audioState;
    }

    function isBeatPeak() {
      return started && Math.max(0, performance.now() * 0.001 - beatTime) < 0.12;
    }

    return {
      start: start,
      update: update,
      isBeatPeak: isBeatPeak
    };
  }

  function createRadialTexture(size, inner, middle, outer) {
    var canvas = document.createElement("canvas");
    var context;
    var gradient;
    var texture;

    canvas.width = size;
    canvas.height = size;
    context = canvas.getContext("2d");
    gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.34, middle);
    gradient.addColorStop(1, outer);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  function createStarField(texture) {
    addStarLayer(texture, 3200, 2200, 1.9, 0.58, 0.0018);
    addStarLayer(texture, 2300, 3600, 2.7, 0.42, 0.0012);
    addStarLayer(texture, 1200, 5600, 3.4, 0.3, 0.0008);
  }

  function addStarLayer(texture, count, radius, size, opacity, speed) {
    var geometry = new THREE.BufferGeometry();
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var color = new THREE.Color();
    var i;
    var index;
    var theta;
    var phi;
    var r;

    for (i = 0; i < count; i += 1) {
      index = i * 3;
      theta = Math.random() * Math.PI * 2;
      phi = Math.acos(2 * Math.random() - 1);
      r = radius * (0.42 + Math.random() * 0.58);
      positions[index] = r * Math.sin(phi) * Math.cos(theta);
      positions[index + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[index + 2] = r * Math.cos(phi);

      if (Math.random() > 0.9) {
        color.set(0xffb8d8);
      } else if (Math.random() > 0.92) {
        color.set(0xb8a8ff);
      } else {
        color.set(0xffffff);
      }

      colors[index] = color.r;
      colors[index + 1] = color.g;
      colors[index + 2] = color.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    var points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: size,
        map: texture,
        transparent: true,
        opacity: opacity,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    points.userData.baseOpacity = opacity;
    points.userData.speed = speed;
    stars.push(points);
    starRoot.add(points);
  }

  function createHeartParticles(texture) {
    var geometry = new THREE.BufferGeometry();
    var positions = new Float32Array(SETTINGS.heartParticles * 3);
    var basePositions = new Float32Array(SETTINGS.heartParticles * 3);
    var chaosPositions = new Float32Array(SETTINGS.heartParticles * 3);
    var colors = new Float32Array(SETTINGS.heartParticles * 3);
    var phases = new Float32Array(SETTINGS.heartParticles);
    var flows = new Float32Array(SETTINGS.heartParticles);
    var swirls = new Float32Array(SETTINGS.heartParticles);
    var ember = new THREE.Color(0x5b0820);
    var red = new THREE.Color(0xb41438);
    var magenta = new THREE.Color(0xff2f92);
    var pink = new THREE.Color(0xff78bd);
    var violet = new THREE.Color(0x8b63ff);
    var color = new THREE.Color();
    var i;
    var index;
    var t;
    var fill;
    var contour;
    var x;
    var y;
    var z;
    var jitter;
    var scale;
    var depth;
    var lobe;
    var chaosRadius;
    var chaosTheta;
    var chaosPhi;

    for (i = 0; i < SETTINGS.heartParticles; i += 1) {
      index = i * 3;
      t = Math.random() * Math.PI * 2;
      contour = Math.random() < 0.46;
      fill = contour ? 0.82 + Math.pow(Math.random(), 2.6) * 0.22 : Math.pow(Math.random(), 0.42) * 0.88;
      x = 16 * Math.pow(Math.sin(t), 3);
      y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      scale = 18.6;
      depth = 58 + (1 - Math.min(fill, 1)) * 170 + (contour ? 30 : 0);
      lobe = Math.sin(t * 3 + Math.random() * 0.4) * 12 * (1 - Math.min(fill, 1));
      z = (Math.random() - 0.5) * depth + lobe;
      jitter = (Math.random() - 0.5) * (contour ? 13 : 20) * (0.28 + (1 - Math.min(fill, 1)) * 0.9);
      basePositions[index] = x * fill * scale + jitter;
      basePositions[index + 1] = y * fill * scale + 22 + jitter * 0.28;
      basePositions[index + 2] = z;

      chaosRadius = 720 + Math.random() * 1150;
      chaosTheta = Math.random() * Math.PI * 2;
      chaosPhi = Math.acos(2 * Math.random() - 1);
      chaosPositions[index] = chaosRadius * Math.sin(chaosPhi) * Math.cos(chaosTheta);
      chaosPositions[index + 1] = chaosRadius * Math.sin(chaosPhi) * Math.sin(chaosTheta);
      chaosPositions[index + 2] = chaosRadius * Math.cos(chaosPhi);
      positions[index] = chaosPositions[index];
      positions[index + 1] = chaosPositions[index + 1];
      positions[index + 2] = chaosPositions[index + 2];

      if (contour) {
        color.copy(magenta).lerp(pink, Math.random() * 0.42);
      } else if (fill < 0.26) {
        color.copy(ember).lerp(red, 0.45 + Math.random() * 0.3);
      } else if (Math.random() > 0.62) {
        color.copy(violet).lerp(magenta, 0.34 + Math.random() * 0.3);
      } else {
        color.copy(red).lerp(pink, Math.random() * 0.62);
      }

      colors[index] = color.r;
      colors[index + 1] = color.g;
      colors[index + 2] = color.b;
      phases[i] = Math.random() * Math.PI * 2;
      flows[i] = 3.5 + Math.random() * (contour ? 12 : 8);
      swirls[i] = 0.35 + Math.random() * 0.9;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    geometry.userData.basePositions = basePositions;
    geometry.userData.chaosPositions = chaosPositions;
    geometry.userData.phases = phases;
    geometry.userData.flows = flows;
    geometry.userData.swirls = swirls;

    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 3.25,
        map: texture,
        transparent: true,
        opacity: 0,
        vertexColors: true,
        color: 0xffbdd9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
  }

  function createHeartCore(texture) {
    var geometry = new THREE.BufferGeometry();
    var positions = new Float32Array(SETTINGS.coreParticles * 3);
    var basePositions = new Float32Array(SETTINGS.coreParticles * 3);
    var chaosPositions = new Float32Array(SETTINGS.coreParticles * 3);
    var colors = new Float32Array(SETTINGS.coreParticles * 3);
    var phases = new Float32Array(SETTINGS.coreParticles);
    var flows = new Float32Array(SETTINGS.coreParticles);
    var swirls = new Float32Array(SETTINGS.coreParticles);
    var magenta = new THREE.Color(0xff3f9e);
    var pink = new THREE.Color(0xff8bc8);
    var violet = new THREE.Color(0x9b72ff);
    var red = new THREE.Color(0xa30e32);
    var color = new THREE.Color();
    var i;
    var index;
    var t;
    var fill;
    var x;
    var y;
    var chaosRadius;
    var chaosTheta;
    var chaosPhi;

    for (i = 0; i < SETTINGS.coreParticles; i += 1) {
      index = i * 3;
      t = Math.random() * Math.PI * 2;
      fill = Math.pow(Math.random(), 0.32) * (0.7 + Math.random() * 0.32);
      x = 16 * Math.pow(Math.sin(t), 3);
      y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

      basePositions[index] = x * fill * 19.8 + (Math.random() - 0.5) * 36;
      basePositions[index + 1] = y * fill * 19.8 + 22 + (Math.random() - 0.5) * 24;
      basePositions[index + 2] = (Math.random() - 0.5) * (160 + (1 - Math.min(fill, 1)) * 150);

      chaosRadius = 620 + Math.random() * 980;
      chaosTheta = Math.random() * Math.PI * 2;
      chaosPhi = Math.acos(2 * Math.random() - 1);
      chaosPositions[index] = chaosRadius * Math.sin(chaosPhi) * Math.cos(chaosTheta);
      chaosPositions[index + 1] = chaosRadius * Math.sin(chaosPhi) * Math.sin(chaosTheta);
      chaosPositions[index + 2] = chaosRadius * Math.cos(chaosPhi);
      positions[index] = chaosPositions[index];
      positions[index + 1] = chaosPositions[index + 1];
      positions[index + 2] = chaosPositions[index + 2];

      if (Math.random() > 0.66) {
        color.copy(violet).lerp(pink, 0.25 + Math.random() * 0.3);
      } else if (fill > 0.78) {
        color.copy(magenta).lerp(pink, Math.random() * 0.35);
      } else {
        color.copy(red).lerp(magenta, 0.38 + Math.random() * 0.32);
      }

      colors[index] = color.r;
      colors[index + 1] = color.g;
      colors[index + 2] = color.b;
      phases[i] = Math.random() * Math.PI * 2;
      flows[i] = 7 + Math.random() * 18;
      swirls[i] = 0.45 + Math.random() * 1.15;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    geometry.userData.basePositions = basePositions;
    geometry.userData.chaosPositions = chaosPositions;
    geometry.userData.phases = phases;
    geometry.userData.flows = flows;
    geometry.userData.swirls = swirls;

    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 9.2,
        map: texture,
        transparent: true,
        opacity: 0,
        vertexColors: true,
        color: 0xff8fc5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
  }

  function createHeartHalo() {
    var material = new THREE.SpriteMaterial({
      map: createRadialTexture(
        512,
        "rgba(255,90,180,0.18)",
        "rgba(160,70,255,0.08)",
        "rgba(70,20,120,0)"
      ),
      color: 0xff67b5,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var sprite = new THREE.Sprite(material);
    sprite.position.set(0, 22, -80);
    sprite.scale.set(720, 590, 1);
    return sprite;
  }

  function createCosmicDust(texture) {
    var geometry = new THREE.BufferGeometry();
    var positions = new Float32Array(SETTINGS.dustParticles * 3);
    var colors = new Float32Array(SETTINGS.dustParticles * 3);
    var color = new THREE.Color();
    var i;
    var index;
    var angle;
    var radius;

    for (i = 0; i < SETTINGS.dustParticles; i += 1) {
      index = i * 3;
      angle = Math.random() * Math.PI * 2;
      radius = 300 + Math.random() * 980;
      positions[index] = Math.cos(angle) * radius;
      positions[index + 1] = (Math.random() - 0.5) * 330;
      positions[index + 2] = Math.sin(angle) * radius * (0.52 + Math.random() * 0.28);
      color.set(Math.random() > 0.58 ? 0xff5aa8 : Math.random() > 0.42 ? 0x9369dc : 0x4d2b90);
      colors[index] = color.r;
      colors[index + 1] = color.g;
      colors[index + 2] = color.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 3.0,
        map: texture,
        transparent: true,
        opacity: 0,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
  }

  function updateHeartFormation(progress, elapsed, pulse) {
    var eased;

    eased = easeOutCubic(progress);
    updateNebulaParticleLayer(heart, eased, elapsed, pulse, 1);
    updateNebulaParticleLayer(heartCore, eased, elapsed + 1.7, pulse, 0.62);

    if (progress >= 0.999) {
      formationComplete = true;
    }
  }

  function updateNebulaParticleLayer(points, eased, elapsed, pulse, strength) {
    var geometry;
    var positions;
    var base;
    var chaos;
    var phases;
    var flows;
    var swirls;
    var i;
    var particle;
    var bx;
    var by;
    var bz;
    var dy;
    var len;
    var wave;
    var push;
    var nx;
    var ny;
    var dx;
    var dz;
    var rot;
    var cos;
    var sin;
    var rx;
    var rz;

    if (!points || !points.geometry || eased <= 0) {
      return;
    }

    geometry = points.geometry;
    positions = geometry.attributes.position.array;
    base = geometry.userData.basePositions;
    chaos = geometry.userData.chaosPositions;
    phases = geometry.userData.phases;
    flows = geometry.userData.flows;
    swirls = geometry.userData.swirls;

    for (particle = 0, i = 0; i < positions.length; particle += 1, i += 3) {
      bx = base[i];
      by = base[i + 1];
      bz = base[i + 2];
      dy = by - 22;
      len = Math.sqrt(bx * bx + dy * dy) + 0.001;
      nx = bx / len;
      ny = dy / len;
      wave =
        Math.sin(elapsed * (0.52 + swirls[particle] * 0.08) + phases[particle]) * flows[particle] +
        Math.sin(elapsed * 0.23 + phases[particle] * 0.73) * flows[particle] * 0.32;
      push = wave * strength + pulse * 18 * strength;
      dx = bx + nx * push;
      by = by + ny * push * 0.72;
      dz = bz + Math.sin(elapsed * 0.44 + phases[particle]) * flows[particle] * 0.54 + pulse * 12 * strength;
      rot = (elapsed * 0.004 + Math.sin(elapsed * 0.18 + phases[particle]) * 0.006) * swirls[particle] * strength;
      cos = Math.cos(rot);
      sin = Math.sin(rot);
      rx = dx * cos - dz * sin;
      rz = dx * sin + dz * cos;

      positions[i] = chaos[i] + (rx - chaos[i]) * eased;
      positions[i + 1] = chaos[i + 1] + (by - chaos[i + 1]) * eased;
      positions[i + 2] = chaos[i + 2] + (rz - chaos[i + 2]) * eased;
    }

    geometry.attributes.position.needsUpdate = true;
  }

  function updateCinematicCamera(elapsed, delta) {
    var t;
    var orbit;

    if (elapsed >= 24) {
      if (controls) {
        controls.enabled = true;
      }
      return;
    }

    if (controls) {
      controls.enabled = false;
    }

    if (elapsed < 10) {
      t = easeOutCubic(smoothstep(0, 10, elapsed));
      desiredCamera.lerpVectors(cameraStart, cameraMid, t);
      desiredTarget.set(0, 28, 0);
    } else {
      t = smoothstep(10, 24, elapsed);
      orbit = -0.16 + t * 0.48;
      desiredCamera.set(Math.sin(orbit) * 160, 92 - t * 16, Math.cos(orbit) * (1320 - t * 360));
      desiredTarget.set(0, 22, 0);
    }

    camera.position.lerp(desiredCamera, 1 - Math.exp(-1.55 * delta));
    cameraTarget.lerp(desiredTarget, 1 - Math.exp(-2.0 * delta));
    camera.lookAt(cameraTarget);

    if (controls) {
      controls.target.copy(cameraTarget);
    }
  }

  function updateInterfaceText(text) {
    var counter = document.getElementById("contador");
    if (counter) {
      counter.style.transition = "opacity 900ms ease, transform 900ms ease";
      counter.textContent = text;
    }
  }

  function addUpdatable(callback) {
    if (typeof callback === "function") {
      updatables.push(callback);
    }
  }

  function onPointerMove(event) {
    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    mouse.y = -(((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
    mouse.active = true;
  }

  function onPointerLeave() {
    mouse.active = false;
  }

  function updateHeartHover(delta) {
    var target = 0;
    var dx;
    var dy;
    var distance;

    projectedHeart.set(0, 22, 0).project(camera);
    if (mouse.active && projectedHeart.z > -1 && projectedHeart.z < 1) {
      dx = mouse.x - projectedHeart.x;
      dy = mouse.y - projectedHeart.y;
      distance = Math.sqrt(dx * dx + dy * dy);
      target = 1 - smoothstep(0.08, 0.38, distance);
    }

    heartHover += (target - heartHover) * (1 - Math.exp(-5.2 * delta));
    heart.material.color.set(0xffbdd9).lerp(new THREE.Color(0xff74bc), heartHover * 0.42);
    heart.material.size = 3.25 + heartHover * 0.34;
    heartCore.material.color.set(0xff8fc5).lerp(new THREE.Color(0xff4fb0), heartHover * 0.34);
    heartCore.material.size = 9.2 + heartHover * 0.8;
  }

  function showRandomPhrase(elapsed) {
    var angle;
    var radius;
    var position;

    if (floatingTexts.length >= 5) {
      nextPhraseAt = elapsed + 1.2;
      return;
    }

    angle = Math.random() * Math.PI * 2;
    radius = 250 + Math.random() * 420;
    position = new THREE.Vector3(
      Math.cos(angle) * radius,
      -20 + Math.random() * 260,
      Math.sin(angle) * radius * 0.7
    );

    showFloatingText(PHRASES[phraseIndex % PHRASES.length], position, {
      duration: 7.8,
      scale: 0.72
    });
    phraseIndex += 1;
    nextPhraseAt = elapsed + (audioState.started ? 2.8 : 3.5) + Math.random() * 1.8;
  }

  function showHiddenPhrase(elapsed) {
    var distance = camera.position.distanceTo(controls ? controls.target : new THREE.Vector3(0, 22, 0));
    var position;
    var angle;

    if (distance > 860 || elapsed < nextHiddenAt || floatingTexts.length >= 5) {
      return;
    }

    angle = Math.random() * Math.PI * 2;
    position = new THREE.Vector3(
      Math.cos(angle) * (150 + Math.random() * 190),
      80 + Math.random() * 150,
      Math.sin(angle) * (120 + Math.random() * 160)
    );

    showFloatingText(HIDDEN_PHRASES[hiddenIndex % HIDDEN_PHRASES.length], position, {
      duration: 7.2,
      scale: 0.68
    });
    hiddenIndex += 1;
    nextHiddenAt = elapsed + 8 + Math.random() * 5;
  }

  function showFloatingText(text, position, options) {
    var opts = options || {};
    var sprite = createTextSprite(text, opts);
    var item;

    sprite.position.copy(position || new THREE.Vector3(0, 140, 0));
    sprite.scale.multiplyScalar(opts.scale || 1);
    textLayer.add(sprite);

    item = {
      sprite: sprite,
      start: clock.elapsedTime,
      duration: opts.duration || 7,
      baseScale: sprite.scale.clone(),
      drift: new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        12 + Math.random() * 12,
        (Math.random() - 0.5) * 10
      )
    };
    floatingTexts.push(item);
    return sprite;
  }

  function createTextSprite(text, options) {
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    var width = 1024;
    var height = options.large ? 220 : 150;
    var fontSize = options.large ? 42 : 30;
    var texture;
    var material;
    var sprite;

    canvas.width = width;
    canvas.height = height;
    context.font = fontSize + "px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = "rgba(255,100,160,0.72)";
    context.shadowBlur = options.large ? 24 : 14;
    context.fillStyle = "rgba(255,245,250,0.95)";
    context.fillText(text, width / 2, height / 2);

    texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    sprite = new THREE.Sprite(material);
    sprite.scale.set(options.large ? 620 : 360, options.large ? 132 : 54, 1);
    return sprite;
  }

  function updateFloatingTexts(elapsed, delta) {
    var i;
    var item;
    var age;
    var life;
    var opacity;

    for (i = floatingTexts.length - 1; i >= 0; i -= 1) {
      item = floatingTexts[i];
      age = elapsed - item.start;
      life = Math.max(0, Math.min(1, age / item.duration));
      opacity = smoothstep(0, 0.18, life) * (1 - smoothstep(0.72, 1, life));
      item.sprite.material.opacity = opacity * 0.84;
      item.sprite.position.addScaledVector(item.drift, delta * 0.12);
      item.sprite.quaternion.copy(camera.quaternion);
      item.sprite.scale.copy(item.baseScale).multiplyScalar(1 + Math.sin(elapsed * 0.85 + i) * 0.018);

      if (age > item.duration) {
        textLayer.remove(item.sprite);
        if (item.sprite.material.map) {
          item.sprite.material.map.dispose();
        }
        item.sprite.material.dispose();
        floatingTexts.splice(i, 1);
      }
    }
  }

  function showFinalMessage(elapsed) {
    if (finalMessageShown || elapsed < 45) {
      return;
    }

    finalMessageShown = true;
    showFloatingText("Este universo existe porque t\u00fa est\u00e1s en \u00e9l \u2764\uFE0F", new THREE.Vector3(0, 245, 90), {
      large: true,
      duration: 22,
      scale: 1.02
    });
  }

  function animate() {
    var delta = Math.min(clock.getDelta(), 0.033);
    var elapsed = clock.elapsedTime;
    var music = musicEngine.update();
    var starIntro = smoothstep(0, 7, elapsed);
    var formation = smoothstep(8, 22, elapsed);
    var photoIntro = smoothstep(20, 32, elapsed);
    var pulse = music.beat * 0.035 + music.energy * 0.016 + heartHover * 0.022;
    var breath = 1 + Math.sin(elapsed * 1.08) * 0.022 + pulse;
    var i;

    requestAnimationFrame(animate);

    updateCinematicCamera(elapsed, delta);
    updateHeartHover(delta);
    updateHeartFormation(formation, elapsed, pulse);
    introProgress += (starIntro - introProgress) * (1 - Math.exp(-2.5 * delta));

    heartGroup.scale.setScalar(breath);
    heartGroup.rotation.y += delta * 0.052;
    heartGroup.rotation.z = Math.sin(elapsed * 0.2) * 0.012;
    universe.rotation.y += delta * 0.004;
    dustGroup.rotation.y -= delta * 0.018;

    for (i = 0; i < stars.length; i += 1) {
      stars[i].rotation.y += delta * stars[i].userData.speed;
      stars[i].rotation.x += delta * stars[i].userData.speed * 0.35;
      stars[i].material.opacity =
        (stars[i].userData.baseOpacity + Math.sin(elapsed * (0.55 + i * 0.11)) * 0.045) * introProgress;
    }

    heart.material.opacity = (0.82 + heartHover * 0.08 + music.energy * 0.035) * formation;
    heartCore.material.opacity = (0.34 + heartHover * 0.08 + music.beat * 0.04) * formation;
    heartHalo.material.opacity = (0.16 + Math.sin(elapsed * 0.9) * 0.035 + heartHover * 0.07 + music.energy * 0.025) * formation;
    dust.material.opacity = (0.24 + music.energy * 0.045) * photoIntro;
    audioState.photoReveal = photoIntro;

    if (elapsed > nextPhraseAt && (musicEngine.isBeatPeak() || !audioState.started)) {
      showRandomPhrase(elapsed);
    }

    showHiddenPhrase(elapsed);
    showFinalMessage(elapsed);
    updateFloatingTexts(elapsed, delta);

    for (i = 0; i < updatables.length; i += 1) {
      updatables[i](elapsed, delta, audioState);
    }

    if (controls && controls.enabled) {
      controls.update();
    }

    renderer.render(scene, camera);
  }

  function onResize() {
    SETTINGS.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(SETTINGS.pixelRatio);
  }

  function smoothstep(edge0, edge1, value) {
    var x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
    return x * x * (3 - 2 * x);
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
  }
})();

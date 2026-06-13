(function () {
  "use strict";

  var IMAGE_PATHS = [
    "Fotos/Inicio.jpeg",
    "Fotos/1mesesito.jpeg",
    "Fotos/2mesesito.jpeg",
    "Fotos/3mesesito.jpeg",
    "Fotos/4mesesito.jpeg",
    "Fotos/1.jpeg",
    "Fotos/2.jpeg",
    "Fotos/3.jpeg",
    "Fotos/4.jpeg",
    "Fotos/5.jpeg",
    "Fotos/6.jpeg",
    "Fotos/7.jpeg",
    "Fotos/8.jpeg",
    "Fotos/9.jpeg",
    "Fotos/10.jpeg",
    "Fotos/11.jpeg",
    "Fotos/12.jpeg",
    "Fotos/13.jpeg",
    "Fotos/14.jpeg",
    "Fotos/15.jpeg",
    "Fotos/16.jpeg",
    "Fotos/17.jpeg",
    "Fotos/18.jpeg"
  ];

  function init(api) {
    if (!api || !api.camera || !window.THREE) {
      return;
    }

    var camera = api.camera;
    var renderer = api.renderer;
    var loader = api.textureLoader || new THREE.TextureLoader();
    var parent = api.photoLayer || api.scene;
    var orbitGroup = new THREE.Group();
    var photos = [];
    var discGeometry = new THREE.CircleGeometry(0.5, 72);
    var backingGeometry = new THREE.CircleGeometry(0.58, 72);
    var ringGeometry = new THREE.RingGeometry(0.52, 0.6, 72);
    var glowTexture = createGlowTexture();

    orbitGroup.name = "memorias-circulares";
    parent.add(orbitGroup);

    IMAGE_PATHS.forEach(function (src, index) {
      var photo = createPhoto(src, index, IMAGE_PATHS.length);
      photos.push(photo);
      orbitGroup.add(photo.group);
    });

    api.addUpdatable(function (elapsed) {
      var audio = api.audioState || { beat: 0, energy: 0 };
      var reveal = typeof audio.photoReveal === "number" ? audio.photoReveal : smoothstep(20, 32, elapsed);

      photos.forEach(function (item) {
        var config = item.config;
        var angle = config.phase + elapsed * config.speed;
        var floatY = Math.sin(elapsed * 0.58 + config.phase) * config.float;
        var scale = config.size * reveal * (1 + Math.sin(elapsed * 0.86 + config.phase) * 0.018 + audio.beat * 0.025);

        item.group.position.set(
          Math.cos(angle) * config.radiusX,
          config.height + floatY,
          Math.sin(angle + config.tilt) * config.radiusZ
        );

        item.group.quaternion.copy(camera.quaternion);
        item.group.scale.setScalar(Math.max(0.001, scale));
        item.group.visible = true;
        item.disc.material.opacity = reveal * 0.98;
        item.backing.material.opacity = reveal * 0.9;
        item.ring.material.opacity = reveal * (0.42 + Math.sin(elapsed * 0.8 + config.phase) * 0.05 + audio.energy * 0.04);
        item.glow.material.opacity = reveal * (0.24 + audio.energy * 0.05);
      });
    });

    function createPhoto(src, index, total) {
      var group = new THREE.Group();
      var config = createConfig(index, total);
      var discMaterial = new THREE.MeshBasicMaterial({
        map: createPlaceholderTexture(index),
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      var backing = new THREE.Mesh(
        backingGeometry,
        new THREE.MeshBasicMaterial({
          color: 0x090207,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      var disc = new THREE.Mesh(discGeometry, discMaterial);
      var ring = new THREE.Mesh(
        ringGeometry,
        new THREE.MeshBasicMaterial({
          color: index % 2 === 0 ? 0xff75b2 : 0xbfa2ff,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      var glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          color: index % 2 === 0 ? 0xff6fb2 : 0xa88bff,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );

      glow.position.z = -0.045;
      glow.scale.set(1.38, 1.38, 1);
      backing.position.z = -0.018;
      disc.position.z = 0;
      ring.position.z = 0.022;
      group.add(glow);
      group.add(backing);
      group.add(disc);
      group.add(ring);

      loadTexture(src, discMaterial, index);

      return {
        group: group,
        disc: disc,
        backing: backing,
        ring: ring,
        glow: glow,
        config: config
      };
    }

    function createConfig(index, total) {
      var band = index % 5;
      var normalized = index / Math.max(1, total - 1);
      var radius = 520 + band * 135 + (index % 3) * 38;

      return {
        radiusX: radius + Math.sin(index * 1.37) * 54,
        radiusZ: radius * (0.64 + (index % 4) * 0.055),
        height: -170 + (index % 9) * 44 + Math.sin(index * 0.71) * 20,
        size: 34 + (index % 6) * 3.2,
        speed: (index % 2 === 0 ? 1 : -1) * (0.022 + normalized * 0.024),
        phase: index * 2.399963,
        tilt: Math.sin(index * 0.73) * 0.38,
        float: 8 + (index % 5) * 2.2
      };
    }

    function loadTexture(src, material, index) {
      loader.load(
        src,
        function (texture) {
          var image = texture.image || {};

          if (THREE.sRGBEncoding) {
            texture.encoding = THREE.sRGBEncoding;
          }
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.anisotropy = renderer ? Math.min(renderer.capabilities.getMaxAnisotropy(), 8) : 4;
          applyCover(texture, image.width || 1, image.height || 1);

          if (material.map) {
            material.map.dispose();
          }
          material.map = texture;
          material.color.set(0xffffff);
          material.needsUpdate = true;
        },
        undefined,
        function () {
          console.warn("No se pudo cargar la foto:", src);
          if (material.map) {
            material.map.dispose();
          }
          material.map = createPlaceholderTexture(index);
          material.color.set(0xffffff);
          material.needsUpdate = true;
        }
      );
    }
  }

  function applyCover(texture, width, height) {
    var aspect = width / Math.max(1, height);

    texture.repeat.set(1, 1);
    texture.offset.set(0, 0);

    if (aspect > 1) {
      texture.repeat.x = 1 / aspect;
      texture.offset.x = (1 - texture.repeat.x) * 0.5;
    } else {
      texture.repeat.y = aspect;
      texture.offset.y = (1 - texture.repeat.y) * 0.5;
    }
  }

  function createGlowTexture() {
    var canvas = document.createElement("canvas");
    var context;
    var gradient;
    var texture;

    canvas.width = 256;
    canvas.height = 256;
    context = canvas.getContext("2d");
    gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "rgba(255,190,230,0.34)");
    gradient.addColorStop(0.42, "rgba(255,95,175,0.2)");
    gradient.addColorStop(1, "rgba(255,80,160,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);

    texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  function createPlaceholderTexture(index) {
    var canvas = document.createElement("canvas");
    var context;
    var gradient;
    var texture;

    canvas.width = 256;
    canvas.height = 256;
    context = canvas.getContext("2d");
    gradient = context.createRadialGradient(86, 72, 18, 128, 128, 132);
    gradient.addColorStop(0, index % 2 === 0 ? "#ffd1e6" : "#e4dcff");
    gradient.addColorStop(0.46, index % 2 === 0 ? "#ff6fad" : "#a98cff");
    gradient.addColorStop(1, "#13030d");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    context.fillStyle = "rgba(255,245,250,0.92)";
    context.font = "66px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("\u2665", 128, 132);

    texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  function smoothstep(edge0, edge1, value) {
    var x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
    return x * x * (3 - 2 * x);
  }

  if (window.NuestroUniverso) {
    init(window.NuestroUniverso);
  } else {
    window.addEventListener(
      "nuestro-universo-ready",
      function () {
        init(window.NuestroUniverso);
      },
      { once: true }
    );
  }
})();

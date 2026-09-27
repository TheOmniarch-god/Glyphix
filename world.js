/* ============================================================
   The Gu World — High-Performance 3D WebGL Landscape Engine
   
   Instant GPU vertex-colored terrain for Qing Mao Mountain,
   Gu Yue Village, Bai Peak, Xiong Peak, and Southern Border.
   Runs at a rock-solid 60 FPS with zero main-thread freezing.
   ============================================================ */
(function () {
  'use strict';

  var SPAN = 64;                 // world units across
  var GRID = 56;                 // 57x57 = 3,249 vertices: instant <10ms generation, buttery 60fps
  var REACH = 8.8;
  var REACH_AT = { 1: 7.4, 2: 7.7, 3: 8.0, 4: 8.4, 5: 8.8 };
  var FRONTIER = 5;

  // ── Fast Noise Mathematics ────────────────────────────────────────────────
  function hash(x, z) {
    var n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
    return n - Math.floor(n);
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function noise(x, z) {
    var xi = Math.floor(x), zi = Math.floor(z);
    var xf = x - xi, zf = z - zi;
    var a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
    var u = smooth(xf), v = smooth(zf);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }

  // Fast, closed-form physical height function
  function heightAt(x, z) {
    var dCenter = Math.hypot(x, z);

    // Qing Mao Mountain: Primary majestic summit at (5.5, -2.8)
    var dQingMao = Math.hypot(x - 5.5, z + 2.8);
    var qCone = Math.max(0, 1 - dQingMao / 15.5);
    var qPeak = Math.pow(qCone, 1.8) * 8.6 + (1 - Math.abs(noise(x * 0.38 + 2.1, z * 0.38 + 5.7) * 2 - 1)) * 3.6 * qCone;

    // Gu Yue Village: Terraced mountain shelf at (0.5, 0.5)
    var dVillage = Math.hypot(x - 0.5, z - 0.5);
    var vShelf = Math.max(0, 1 - dVillage / 4.8);
    var vFlatten = 1.0 - Math.pow(vShelf, 1.5) * 0.65;
    var vGround = Math.pow(vShelf, 1.3) * 2.65;

    // Terraced slopes
    var terraced = Math.floor(qPeak * 2.2) / 2.2;
    var blended = qPeak * (1 - vShelf * 0.7) + terraced * (vShelf * 0.7);

    // River valley carving through foothills
    var riverDist = Math.abs(x * 0.62 + z * 0.78 - 3.8 + Math.sin(z * 0.45) * 1.2);
    var riverCut = Math.max(0, 1 - riverDist / 2.8) * 1.55;

    // Bai Clan Peak to Northwest (-16.5, -12.0)
    var dBai = Math.hypot(x + 16.5, z + 12.0);
    var bCone = Math.max(0, 1 - dBai / 14.0);
    var bPeak = Math.pow(bCone, 1.7) * 7.4 + (1 - Math.abs(noise(x * 0.32 + 12.3, z * 0.32 + 4.1) * 2 - 1)) * 2.8 * bCone;

    // Xiong Clan Peak to Northeast (17.0, -11.5)
    var dXiong = Math.hypot(x - 17.0, z + 11.5);
    var xCone = Math.max(0, 1 - dXiong / 14.5);
    var xPeak = Math.pow(xCone, 1.65) * 7.1 + (1 - Math.abs(noise(x * 0.33 + 7.1, z * 0.33 + 19.3) * 2 - 1)) * 2.6 * xCone;

    // Southern Border rolling hills
    var hills = (noise(x * 0.12 + 1.1, z * 0.12 + 2.7) * 2.2 + noise(x * 0.25 + 5.3, z * 0.25 + 3.1) * 1.1);
    var boundary = Math.max(0, 1 - dCenter / 31.0);

    var y = ((blended + vGround - riverCut) * vFlatten + bPeak + xPeak + hills) * boundary;
    return Math.max(0.12, y);
  }

  // ── 14 Canonical Vantage Presets ──────────────────────────────────────────
  var VANTAGE_PRESETS = {
    overview:           { tx: 0.5,  tz: 0.5,   ty: 1.4,  dist: 36,   az: 2.45, pitch: 0.32 },
    village:            { tx: 0.5,  tz: 0.5,   ty: 2.6,  dist: 12.5, az: 2.35, pitch: 0.28 },
    hall:               { tx: 0.45, tz: 0.40,  ty: 2.7,  dist: 5.8,  az: 2.20, pitch: 0.22 },
    academy:            { tx: 0.55, tz: 0.45,  ty: 2.65, dist: 6.2,  az: 2.30, pitch: 0.24 },
    cavern:             { tx: 0.75, tz: 0.85,  ty: 1.85, dist: 6.5,  az: 2.10, pitch: 0.25 },
    'mo-manor':         { tx: -1.2, tz: 0.75,  ty: 2.45, dist: 7.2,  az: 2.60, pitch: 0.26 },
    'chi-manor':        { tx: 1.7,  tz: 0.55,  ty: 2.45, dist: 7.2,  az: 2.00, pitch: 0.26 },
    'fang-residence':   { tx: 0.15, tz: 0.35,  ty: 2.65, dist: 5.5,  az: 2.35, pitch: 0.22 },
    'mountain-gate':    { tx: 0.20, tz: 1.60,  ty: 2.05, dist: 8.5,  az: 2.40, pitch: 0.22 },
    'north-tower':      { tx: 0.30, tz: -1.20, ty: 3.20, dist: 7.5,  az: 2.50, pitch: 0.25 },
    'south-tower':      { tx: 0.60, tz: 1.90,  ty: 2.10, dist: 7.5,  az: 2.20, pitch: 0.22 },
    bai:                { tx: -16.5,tz: -12.0, ty: 5.20, dist: 25,   az: 3.80, pitch: 0.26 },
    xiong:              { tx: 17.0, tz: -11.5, ty: 4.80, dist: 25,   az: 0.92, pitch: 0.24 },
    'southern-border':  { tx: 0,    tz: 0,     ty: 2.20, dist: 98,   az: 2.45, pitch: 0.36 }
  };

  // Safe early API stub to avoid race conditions
  var pendingQueue = [];
  window.RIWorld = {
    setReach: function (n) { pendingQueue.push(['setReach', n]); },
    setPeople: function (list) { pendingQueue.push(['setPeople', list]); },
    zoom: function (d) { pendingQueue.push(['zoom', d]); },
    zoomIn: function () { pendingQueue.push(['zoomIn']); },
    zoomOut: function () { pendingQueue.push(['zoomOut']); },
    look: function (deg) { pendingQueue.push(['look', deg]); },
    vantage: function (name) { pendingQueue.push(['vantage', name]); },
    focus: function (x, z) { pendingQueue.push(['focus', x, z]); },
    reset: function () { pendingQueue.push(['reset']); }
  };

  function boot() {
    var canvas = document.getElementById('worldCanvas');
    if (!canvas) return;

    var isFullWorld = !!canvas.getAttribute('data-zoom');
    var isDark = document.documentElement.getAttribute('data-theme') === 'obsidian';

    // Verify THREE availability
    if (typeof THREE === 'undefined') {
      render2DFallback(canvas, isDark);
      return;
    }

    // ── 1. Fast Renderer Setup ──────────────────────────────────────────────
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: false,
        alpha: false,
        powerPreference: 'default'
      });
      if (!renderer.getContext()) throw new Error('No WebGL context');
    } catch (e) {
      render2DFallback(canvas, isDark);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = false; // Disabled for instant 60fps on all devices
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.12 : 1.22;

    var scene = new THREE.Scene();
    var bgHex = isDark ? 0x0a0b0e : 0xf2eee6;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.Fog(bgHex, 36, 150);

    var camera = new THREE.PerspectiveCamera(38, 1, 0.5, 250);

    // ── 2. Terrain Geometry & Single-Pass Colors ────────────────────────────
    var geo = new THREE.PlaneGeometry(SPAN, SPAN, GRID, GRID);
    geo.rotateX(-Math.PI / 2);

    var pos = geo.attributes.position;
    var count = pos.count;
    var colors = new Float32Array(count * 3);

    // Compute heights
    for (var i = 0; i < count; i++) {
      var vx = pos.getX(i);
      var vz = pos.getZ(i);
      var vy = heightAt(vx, vz);
      pos.setY(i, vy);
    }
    geo.computeVertexNormals();

    var normals = geo.attributes.normal;

    function computeColors(darkTheme) {
      for (var j = 0; j < count; j++) {
        var x = pos.getX(j);
        var z = pos.getZ(j);
        var y = pos.getY(j);
        var ny = normals.getY(j);
        var slope = 1.0 - ny;

        var r, g, b;
        if (y > 8.5) {
          // Alpine frost crest
          var s = darkTheme ? 0.65 : 0.88;
          r = s; g = s + 0.02; b = s + 0.06;
        } else if (slope > 0.48 || (slope > 0.32 && y > 4.2)) {
          // Weathered granite crags
          if (darkTheme) { r = 0.28; g = 0.26; b = 0.24; }
          else { r = 0.50; g = 0.47; b = 0.43; }
        } else if (Math.hypot(x - 0.5, z - 0.5) < 3.0) {
          // Gu Yue Village: rich mountain soil
          if (darkTheme) { r = 0.25; g = 0.18; b = 0.12; }
          else { r = 0.48; g = 0.36; b = 0.24; }
        } else if (y > 1.2 && y < 6.8 && slope < 0.45) {
          // Verdant Qing Mao bamboo green
          if (darkTheme) { r = 0.14; g = 0.27; b = 0.13; }
          else { r = 0.28; g = 0.50; b = 0.24; }
        } else {
          // Mountain loam & foothills
          if (darkTheme) { r = 0.18; g = 0.15; b = 0.10; }
          else { r = 0.38; g = 0.32; b = 0.23; }
        }

        var idx = j * 3;
        colors[idx] = r;
        colors[idx + 1] = g;
        colors[idx + 2] = b;
      }
    }

    computeColors(isDark);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    var terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.04,
      flatShading: false
    });
    var terrainMesh = new THREE.Mesh(geo, terrainMat);
    scene.add(terrainMesh);

    // ── 3. 3D Village Architecture ──────────────────────────────────────────
    var villageGroup = new THREE.Group();

    // Grand Council Hall
    var hallBaseY = heightAt(0.45, 0.40);
    var hallGroup = new THREE.Group();
    hallGroup.position.set(0.45, hallBaseY, 0.40);

    var baseMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x3d3832 : 0x7a746c, roughness: 0.9 });
    var baseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 1.6), baseMat);
    baseMesh.position.y = 0.17;
    hallGroup.add(baseMesh);

    var woodMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x422415 : 0x6e3d23, roughness: 0.75 });
    var wallMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 1.2), woodMat);
    wallMesh.position.y = 0.35 + 0.375;
    hallGroup.add(wallMesh);

    var roofMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x1a1a20 : 0x2e3038, roughness: 0.55 });
    for (var rLevel = 0; rLevel < 3; rLevel++) {
      var rWidth = 1.9 - rLevel * 0.35;
      var roofMesh = new THREE.Mesh(new THREE.ConeGeometry(rWidth, 0.42, 4), roofMat);
      roofMesh.rotation.y = Math.PI / 4;
      roofMesh.position.y = 0.95 + rLevel * 0.45;
      hallGroup.add(roofMesh);
    }

    var hallLight = new THREE.PointLight(0xffa834, 1.8, 8.5);
    hallLight.position.set(0, 0.65, 0);
    hallGroup.add(hallLight);
    villageGroup.add(hallGroup);

    // 16 Stilt Houses
    var stiltHouseCoords = [
      [0.15, 0.35], [0.70, 0.65], [0.40, 0.35], [0.55, 0.45],
      [-1.10, 0.80], [1.65, 0.60], [1.80, 0.45], [-1.25, 0.65],
      [0.85, 1.10], [0.25, 0.50], [0.10, 0.85], [-0.45, 0.35],
      [-0.75, 0.60], [1.15, 0.40], [1.35, 0.75], [-0.20, 1.05]
    ];

    var houseMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x3a2517 : 0x6e4a30, roughness: 0.8 });
    var houseBodyGeo = new THREE.BoxGeometry(0.7, 0.5, 0.7);
    var houseRoofGeo = new THREE.ConeGeometry(0.65, 0.38, 4);

    for (var sh = 0; sh < stiltHouseCoords.length; sh++) {
      var hx = stiltHouseCoords[sh][0];
      var hz = stiltHouseCoords[sh][1];
      var hy = heightAt(hx, hz);

      var houseGroup = new THREE.Group();
      houseGroup.position.set(hx, hy, hz);

      var body = new THREE.Mesh(houseBodyGeo, houseMat);
      body.position.y = 0.35;
      houseGroup.add(body);

      var roof = new THREE.Mesh(houseRoofGeo, roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 0.78;
      houseGroup.add(roof);

      villageGroup.add(houseGroup);
    }

    // Spirit Cavern Light
    var cavernX = 0.75, cavernZ = 0.85;
    var cavernY = heightAt(cavernX, cavernZ);
    var cavernLight = new THREE.PointLight(0x40a0ff, 2.2, 8.0);
    cavernLight.position.set(cavernX, cavernY + 0.35, cavernZ);
    villageGroup.add(cavernLight);

    scene.add(villageGroup);

    // ── 3b. Mountain River Stream ───────────────────────────────────────────
    var riverPts = [];
    for (var rStep = 0; rStep <= 18; rStep++) {
      var rt = rStep / 18;
      var rx = 5.2 * (1 - rt) + 0.15 * rt + Math.sin(rt * 3.8) * 0.65;
      var rz = -2.2 * (1 - rt) + 3.20 * rt + Math.cos(rt * 2.5) * 0.50;
      var ry = heightAt(rx, rz) + 0.05;
      riverPts.push(new THREE.Vector3(rx, ry, rz));
    }
    var riverCurve = new THREE.CatmullRomCurve3(riverPts);
    var riverGeo = new THREE.TubeGeometry(riverCurve, 20, 0.22, 5, false);
    var riverMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x1f4459 : 0x3b7596,
      roughness: 0.15,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85
    });
    scene.add(new THREE.Mesh(riverGeo, riverMat));

    // ── 3c. Setting Sun Celestial Disk ──────────────────────────────────────
    var sunDiskGeo = new THREE.SphereGeometry(2.6, 12, 12);
    var sunDiskMat = new THREE.MeshBasicMaterial({ color: 0xffdfa8, transparent: true, opacity: 0.95 });
    var sunDiskMesh = new THREE.Mesh(sunDiskGeo, sunDiskMat);
    sunDiskMesh.position.set(-38, 28, -26);
    scene.add(sunDiskMesh);

    // ── 4. Sea of Clouds Layer ──────────────────────────────────────────────
    var cloudGeo = new THREE.PlaneGeometry(SPAN * 1.15, SPAN * 1.15, 16, 16);
    cloudGeo.rotateX(-Math.PI / 2);
    var cloudMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0x141620 : 0xf0ece4,
      transparent: true,
      opacity: isDark ? 0.45 : 0.55,
      depthWrite: false
    });
    var cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    cloudMesh.position.y = 1.65;
    scene.add(cloudMesh);

    // ── 5. Natural Lighting (No Expensive Shadow Mapping) ───────────────────
    var sunLight = new THREE.DirectionalLight(0xffdfa8, isDark ? 2.2 : 2.5);
    sunLight.position.set(-36, 26, -24);
    scene.add(sunLight);

    var hemiSky = isDark ? 0x6e8cb5 : 0x8ab4f8;
    var hemiGround = isDark ? 0x2e2015 : 0x54402d;
    var hemiLight = new THREE.HemisphereLight(hemiSky, hemiGround, isDark ? 0.75 : 0.95);
    scene.add(hemiLight);

    var ambLight = new THREE.AmbientLight(isDark ? 0x202028 : 0x444038, 0.45);
    scene.add(ambLight);

    // ── 6. Camera & Navigation ──────────────────────────────────────────────
    var cur = {
      tx: 0.50, tz: 0.50, ty: 1.40,
      dist: isFullWorld ? 36 : 28,
      az: 2.45,
      pitch: 0.32
    };
    var target = {
      tx: cur.tx, tz: cur.tz, ty: cur.ty,
      dist: cur.dist, az: cur.az, pitch: cur.pitch
    };

    function updateCamera() {
      var cx = cur.tx + cur.dist * Math.cos(cur.pitch) * Math.sin(cur.az);
      var cz = cur.tz + cur.dist * Math.cos(cur.pitch) * Math.cos(cur.az);
      var cy = Math.max(1.6, cur.ty + cur.dist * Math.sin(cur.pitch));
      camera.position.set(cx, cy, cz);
      camera.lookAt(cur.tx, cur.ty, cur.tz);
    }

    // ── 7. Controls (Pointer & Touch) ───────────────────────────────────────
    var isDragging = false;
    var prevMouseX = 0, prevMouseY = 0;
    var hint = document.getElementById('worldHint');

    canvas.addEventListener('pointerdown', function (e) {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      if (hint) hint.style.opacity = '0';
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });

    window.addEventListener('pointermove', function (e) {
      if (!isDragging) return;
      var dx = e.clientX - prevMouseX;
      var dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      target.az -= dx * 0.0065;
      target.pitch = Math.max(0.08, Math.min(0.75, target.pitch + dy * 0.005));
    });

    function stopDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      try { if (e && e.pointerId) canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      target.dist = Math.max(2.2, Math.min(125, target.dist + (e.deltaY > 0 ? 3.8 : -3.8)));
    }, { passive: false });

    var pinchDist0 = null;
    canvas.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        pinchDist0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && pinchDist0) {
        var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        target.dist = Math.max(2.2, Math.min(125, target.dist - (d - pinchDist0) * 0.08));
        pinchDist0 = d;
      }
    }, { passive: true });
    canvas.addEventListener('touchend', function () { pinchDist0 = null; });

    // ── 8. Pre-Cached Pin Projections ───────────────────────────────────────
    var pinBox = document.getElementById('worldPins');
    var rawPins = [];
    if (pinBox) {
      var attr = pinBox.getAttribute('data-pins');
      if (attr) {
        try { rawPins = JSON.parse(attr); } catch (err) {}
      }
    }

    // Pre-calculate elevations once
    for (var pi = 0; pi < rawPins.length; pi++) {
      rawPins[pi].y = heightAt(rawPins[pi].x, rawPins[pi].z) + 0.35;
    }

    var castList = window.RI_WORLD_CAST || [];
    for (var ci = 0; ci < castList.length; ci++) {
      castList[ci].y = heightAt(castList[ci].x, castList[ci].z) + 0.45;
    }

    var currentReach = FRONTIER;

    function buildPinsDOM() {
      if (!pinBox) return;
      pinBox.innerHTML = '';

      for (var i = 0; i < rawPins.length; i++) {
        var p = rawPins[i];
        var a = document.createElement('a');
        a.className = 'world-pin' + (p.c <= currentReach ? ' is-live' : '');
        a.href = (isFullWorld ? '../' : '') + p.s;
        a.setAttribute('data-slug', p.s);
        a.setAttribute('data-c', p.c);
        a.innerHTML = '<span class="world-pin-dot"></span><span class="world-pin-label">' +
          p.t + '<em>ch. ' + p.c + '</em></span>';
        pinBox.appendChild(a);
      }

      if (isFullWorld) {
        for (var c = 0; c < castList.length; c++) {
          var charItem = castList[c];
          var ca = document.createElement('a');
          ca.className = 'world-pin world-figure' + (charItem.c <= currentReach ? ' is-live' : '');
          ca.href = '../' + charItem.s;
          ca.setAttribute('data-slug', charItem.s);
          ca.setAttribute('data-c', charItem.c);
          ca.innerHTML = '<span class="world-pin-dot"></span><span class="world-pin-label">' +
            charItem.t + '</span>';
          pinBox.appendChild(ca);
        }
      }
    }
    buildPinsDOM();

    var tempVec = new THREE.Vector3();
    function updatePins(w, h) {
      if (!pinBox) return;
      var pinEls = pinBox.children;
      var elIdx = 0;

      for (var i = 0; i < rawPins.length && elIdx < pinEls.length; i++, elIdx++) {
        var lp = rawPins[i];
        tempVec.set(lp.x, lp.y, lp.z);
        tempVec.project(camera);

        var isBehind = tempVec.z > 1.0;
        var sx = (tempVec.x * 0.5 + 0.5) * w;
        var sy = (-tempVec.y * 0.5 + 0.5) * h;

        var el = pinEls[elIdx];
        if (isBehind || sx < -30 || sx > w + 30 || sy < -30 || sy > h + 30) {
          el.style.display = 'none';
        } else {
          el.style.display = 'block';
          el.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px)';
        }
      }

      if (isFullWorld) {
        for (var j = 0; j < castList.length && elIdx < pinEls.length; j++, elIdx++) {
          var cp = castList[j];
          tempVec.set(cp.x, cp.y, cp.z);
          tempVec.project(camera);

          var cBehind = tempVec.z > 1.0;
          var csx = (tempVec.x * 0.5 + 0.5) * w;
          var csy = (-tempVec.y * 0.5 + 0.5) * h;

          var cel = pinEls[elIdx];
          if (cBehind || csx < -30 || csx > w + 30 || csy < -30 || csy > h + 30) {
            cel.style.display = 'none';
          } else {
            cel.style.display = 'block';
            cel.style.transform = 'translate(' + csx.toFixed(1) + 'px,' + csy.toFixed(1) + 'px)';
          }
        }
      }
    }

    // ── 9. Robust Resize & Theme Observer ───────────────────────────────────
    function onResize() {
      var w = canvas.clientWidth || canvas.offsetWidth || window.innerWidth || 800;
      var h = canvas.clientHeight || canvas.offsetHeight || (isFullWorld ? window.innerHeight : 480) || 480;
      if (w < 20) w = window.innerWidth || 800;
      if (h < 20) h = isFullWorld ? window.innerHeight : 480;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      updateCamera();
    }
    window.addEventListener('resize', onResize);
    onResize();

    function updateThemeColors() {
      isDark = document.documentElement.getAttribute('data-theme') === 'obsidian';
      var bgHex = isDark ? 0x0a0b0e : 0xf2eee6;
      scene.background.setHex(bgHex);
      scene.fog.color.setHex(bgHex);
      cloudMat.color.setHex(isDark ? 0x141620 : 0xf0ece4);
      hemiLight.color.setHex(isDark ? 0x6e8cb5 : 0x8ab4f8);
      hemiLight.groundColor.setHex(isDark ? 0x2e2015 : 0x54402d);
      renderer.toneMappingExposure = isDark ? 1.12 : 1.22;

      computeColors(isDark);
      geo.attributes.color.needsUpdate = true;
    }
    var themeObs = new MutationObserver(updateThemeColors);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // ── 10. Real Public API & Queue Flush ───────────────────────────────────
    var realAPI = {
      setReach: function (n) {
        currentReach = n;
        buildPinsDOM();
      },
      setPeople: function (list) {
        castList = list || [];
        for (var c = 0; c < castList.length; c++) {
          castList[c].y = heightAt(castList[c].x, castList[c].z) + 0.45;
        }
        buildPinsDOM();
      },
      zoom: function (d) { target.dist = Math.max(2.2, Math.min(125, target.dist + d)); },
      zoomIn: function () { target.dist = Math.max(2.2, target.dist - 5.5); },
      zoomOut: function () { target.dist = Math.min(125, target.dist + 5.5); },
      look: function (deg) { target.az = deg * Math.PI / 180; },
      vantage: function (name) {
        var p = VANTAGE_PRESETS[name] || VANTAGE_PRESETS['overview'];
        target.tx = p.tx; target.tz = p.tz; target.ty = p.ty;
        target.dist = p.dist; target.az = p.az; target.pitch = p.pitch;
      },
      focus: function (x, z) {
        target.tx = x; target.tz = z;
        target.ty = heightAt(x, z) + 0.35;
        target.dist = 5.2;
      },
      reset: function () {
        target.tx = 0.50; target.tz = 0.50; target.ty = 1.40;
        target.dist = isFullWorld ? 36 : 28;
        target.az = 2.45; target.pitch = 0.32;
      }
    };

    // Assign real API
    window.RIWorld = realAPI;

    // Flush pending calls
    while (pendingQueue.length > 0) {
      var call = pendingQueue.shift();
      var fn = realAPI[call[0]];
      if (typeof fn === 'function') {
        fn.apply(realAPI, call.slice(1));
      }
    }

    // ── 11. 60 FPS Render Loop ──────────────────────────────────────────────
    var clock = 0;
    function animate() {
      requestAnimationFrame(animate);
      clock += 0.016;

      if (!isDragging) {
        target.az += 0.00065;
      }

      cur.tx += (target.tx - cur.tx) * 0.085;
      cur.tz += (target.tz - cur.tz) * 0.085;
      cur.ty += (target.ty - cur.ty) * 0.085;
      cur.dist += (target.dist - cur.dist) * 0.095;

      var daz = target.az - cur.az;
      while (daz > Math.PI) daz -= Math.PI * 2;
      while (daz < -Math.PI) daz += Math.PI * 2;
      cur.az += daz * 0.085;
      cur.pitch += (target.pitch - cur.pitch) * 0.085;

      updateCamera();

      cloudMesh.position.x = Math.sin(clock * 0.08) * 0.8;
      cloudMesh.position.z = Math.cos(clock * 0.06) * 0.8;
      cavernLight.intensity = 2.0 + Math.sin(clock * 1.8) * 0.6;

      renderer.render(scene, camera);

      var w = canvas.clientWidth || canvas.offsetWidth || window.innerWidth || 800;
      var h = canvas.clientHeight || canvas.offsetHeight || (isFullWorld ? window.innerHeight : 480) || 480;
      updatePins(w, h);
    }
    animate();
  }

  // Graceful 2D parchment fallback if WebGL is unavailable
  function render2DFallback(canvas, isDark) {
    try {
      var ctx = canvas.getContext('2d');
      if (!ctx) return;
      var w = canvas.width = canvas.clientWidth || 800;
      var h = canvas.height = canvas.clientHeight || 480;

      ctx.fillStyle = isDark ? '#0a0b0e' : '#f2eee6';
      ctx.fillRect(0, 0, w, h);

      // Ink mountain ridges
      ctx.fillStyle = isDark ? '#1b1d24' : '#dfd9cc';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.55);
      ctx.lineTo(w * 0.35, h * 0.28);
      ctx.lineTo(w * 0.55, h * 0.42);
      ctx.lineTo(w * 0.75, h * 0.22);
      ctx.lineTo(w, h * 0.48);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Setting sun
      ctx.fillStyle = isDark ? 'rgba(236,199,104,0.35)' : 'rgba(168,121,26,0.25)';
      ctx.beginPath();
      ctx.arc(w * 0.28, h * 0.28, 48, 0, Math.PI * 2);
      ctx.fill();
    } catch (e) {}
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { heightAt: heightAt, VANTAGE_PRESETS: VANTAGE_PRESETS };
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

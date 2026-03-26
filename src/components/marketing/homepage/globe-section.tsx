'use client';

import { useEffect, useRef } from 'react';

export function GlobeSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Globe strip stars
    const strip = stripRef.current;
    if (strip) {
      const sizes = [
        { cls: 'xs', w: 1, o: 0.15, count: 40 },
        { cls: 'sm', w: 1, o: 0.3, count: 25 },
        { cls: 'md', w: 2, o: 0.45, count: 15 },
        { cls: 'lg', w: 3, o: 0.25, count: 6 },
        { cls: 'bright', w: 4, o: 0.7, count: 3 },
      ];
      const starColors = ['#fff', '#fff', '#c8d8ff', '#9abfff'];
      for (let si = 0; si < sizes.length; si++) {
        const s = sizes[si];
        for (let i = 0; i < s.count; i++) {
          const lx = Math.random() * 100;
          const ly = Math.random() * 100;
          const dx = lx - 50;
          const dy = ly - 42;
          if (Math.sqrt(dx * dx + dy * dy) < 30) continue;
          const dot = document.createElement('div');
          dot.style.cssText =
            'position:absolute;border-radius:50%;width:' +
            s.w +
            'px;height:' +
            s.w +
            'px;opacity:' +
            s.o +
            ';left:' +
            (Math.random() * 100) +
            '%;top:' +
            (Math.random() * 100) +
            '%;background:' +
            starColors[Math.floor(Math.random() * 4)];
          if (s.cls === 'bright')
            dot.style.boxShadow = '0 0 6px 1px rgba(200,220,255,.25)';
          if (Math.random() > 0.6) {
            dot.style.animation =
              'twinkle ' +
              (2 + Math.random() * 6).toFixed(1) +
              's ease-in-out infinite ' +
              (Math.random() * 8).toFixed(1) +
              's';
          }
          strip.appendChild(dot);
        }
      }
    }

    // Globe canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w: number, h: number, cx: number, cy: number, globeR: number;
    let rotation = 95;
    const tiltX = 0;
    const tiltY = -0.25;
    let isDragging = false;
    let dragStartX = 0;
    let dragRotStart = 0;
    let animId: number;

    let lastWidth = 0;
    function resize() {
      const rect = canvas!.parentElement!.getBoundingClientRect();
      const newW = Math.round(rect.width);
      const newH = Math.round(rect.height);
      // Only resize canvas when WIDTH changes (not height)
      // Mobile address bar show/hide changes height constantly, causing jitter
      if (newW === lastWidth && canvas!.width > 0) return;
      if (newW < 10 || newH < 10) return; // Container not visible yet
      lastWidth = newW;
      w = canvas!.width = newW;
      h = canvas!.height = newH;
      cx = w / 2;
      cy = h / 2 - h * 0.12;
      // On mobile, use width as primary sizing so globe fills the screen
      globeR = Math.max(1, w < 768 ? w * 0.48 : Math.min(w, h) * 0.44);
    }
    resize();

    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragRotStart = rotation;
      e.preventDefault();
      canvas!.style.cursor = 'grabbing';
    };
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        rotation = dragRotStart + (e.clientX - dragStartX) * 0.15;
      }
    };
    const onMouseUp = () => {
      isDragging = false;
      canvas!.style.cursor = 'grab';
    };

    canvas.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    canvas.style.cursor = 'grab';

    // Continent coordinate outlines
    const CL: [number, number][] = [
      // North America
      [61,-140],[60,-141],[59,-139],[58,-136],[57,-136],[56,-133],[55,-131],[54,-133],[53,-132],[52,-131],[51,-128],[50,-128],[49,-126],[48,-124],[47,-124],[46,-124],[44,-125],[42,-124],[40,-124],[39,-124],[38,-123],[37,-123],[36,-122],[35,-121],[34,-120],[34,-119],[33,-118],[33,-117],[32,-117],[31,-116],[31,-115],[31,-114],[30,-113],[29,-111],[28,-109],[27,-108],[26,-106],[26,-104],[25,-100],[24,-98],[23,-98],[22,-97],[20,-97],[19,-96],[18,-95],[18,-93],[18,-91],[19,-90],[19,-88],[20,-87],[21,-87],[22,-85],[23,-84],[24,-83],[25,-82],[26,-82],[27,-80],[28,-80],[29,-81],[30,-82],[30,-84],[29,-85],[28,-83],[27,-82],[26,-80],[26,-78],[27,-77],[28,-77],[29,-76],[30,-76],[31,-77],[32,-78],[33,-78],[34,-77],[35,-76],[37,-76],[38,-75],[39,-75],[40,-74],[41,-73],[41,-72],[42,-71],[43,-70],[44,-69],[44,-67],[45,-67],[46,-64],[47,-63],[47,-61],[46,-61],[45,-61],[44,-64],[43,-66],[44,-63],[46,-60],[47,-59],[48,-59],[49,-57],[50,-56],[51,-56],[52,-56],[53,-56],[54,-57],[55,-59],[56,-60],[57,-61],[58,-63],[59,-64],[60,-65],[60,-67],[61,-69],[60,-71],[59,-75],[58,-77],[56,-79],[55,-80],[54,-82],[53,-83],[52,-85],[52,-88],[53,-91],[54,-94],[56,-98],[58,-102],[60,-106],[61,-110],[62,-114],[64,-120],[66,-125],[68,-135],[69,-140],[70,-145],[71,-155],[70,-160],[69,-163],[68,-165],[66,-167],[65,-168],[64,-166],[63,-164],[62,-163],[61,-162],[60,-161],[60,-158],[60,-155],[59,-152],[58,-148],[57,-143],[57,-140],[58,-138],[59,-139],[60,-141],
      // Central America & Caribbean
      [20,-87],[18,-88],[17,-89],[16,-90],[15,-90],[15,-89],[14,-88],[13,-87],[12,-86],[11,-85],[10,-84],[9,-84],[9,-83],[8,-82],[8,-80],[8,-78],[9,-79],[10,-78],[10,-76],[11,-75],[12,-72],
      // South America
      [12,-72],[11,-72],[10,-73],[10,-76],[9,-77],[8,-78],[7,-78],[6,-77],[5,-77],[4,-77],[3,-78],[2,-79],[1,-79],[0,-80],[-1,-80],[-2,-80],[-3,-80],[-4,-80],[-5,-79],[-6,-78],[-7,-78],[-8,-77],[-9,-77],[-10,-77],[-11,-76],[-13,-76],[-14,-76],[-16,-75],[-17,-74],[-18,-72],[-18,-70],[-17,-68],[-16,-66],[-15,-66],[-14,-64],[-13,-62],[-12,-61],[-11,-60],[-10,-58],[-9,-56],[-8,-55],[-7,-53],[-6,-51],[-5,-49],[-4,-47],[-3,-45],[-3,-42],[-4,-40],[-5,-37],[-6,-35],[-7,-35],[-8,-35],[-9,-35],[-10,-36],[-11,-37],[-13,-38],[-14,-39],[-16,-40],[-18,-40],[-19,-41],[-21,-42],[-23,-43],[-24,-44],[-26,-46],[-28,-48],[-30,-50],[-32,-52],[-34,-53],[-36,-54],[-38,-57],[-40,-59],[-42,-62],[-44,-64],[-46,-66],[-48,-67],[-50,-68],[-52,-69],[-53,-70],[-54,-70],[-55,-69],[-55,-67],[-54,-65],[-53,-64],[-52,-64],[-51,-66],[-50,-67],[-48,-66],[-46,-65],[-44,-64],[-42,-62],[-40,-58],[-38,-56],[-36,-53],[-34,-52],[-32,-50],[-30,-48],[-28,-46],[-26,-44],[-24,-42],[-22,-40],[-20,-38],[-18,-36],[-16,-35],[-14,-35],[-12,-36],[-10,-37],[-8,-38],[-6,-40],[-4,-44],[-2,-47],[0,-50],[2,-53],[4,-56],[6,-60],[8,-64],[10,-68],[11,-71],[12,-72],
      // Europe
      [36,-6],[37,-5],[38,-4],[38,-2],[38,0],[39,0],[40,0],[41,1],[42,2],[43,3],[43,5],[44,8],[43,10],[43,12],[44,12],[45,12],[46,10],[47,8],[48,7],[49,6],[50,4],[51,3],[51,2],[52,4],[53,5],[53,7],[54,8],[55,8],[56,9],[57,10],[58,11],[58,12],[57,12],[56,12],[55,12],[54,14],[53,14],[52,14],[51,12],[50,12],[50,14],[51,16],[52,16],[53,18],[54,18],[55,16],[56,14],[57,12],[58,10],[59,8],[60,6],[61,5],[62,6],[63,8],[64,12],[65,14],[66,14],[67,16],[68,18],[69,18],[70,20],[70,22],[71,24],[71,26],[70,26],[69,26],[68,26],[67,24],[66,22],[65,20],[64,18],[62,16],[60,16],[59,14],[58,12],[56,12],[54,12],[52,14],[50,14],[48,12],[47,10],[46,10],[45,10],[44,8],[43,6],[42,4],[41,2],[40,0],[39,-2],[38,-4],[37,-6],[36,-6],
      // Africa
      [37,10],[36,8],[36,5],[35,2],[35,0],[34,-2],[34,-5],[33,-8],[32,-10],[31,-12],[30,-13],[28,-13],[27,-14],[25,-15],[24,-16],[22,-17],[20,-17],[18,-17],[16,-16],[14,-16],[13,-16],[12,-16],[11,-15],[10,-14],[9,-13],[8,-11],[7,-8],[6,-6],[6,-4],[5,-1],[5,1],[5,4],[5,7],[5,9],[4,10],[3,10],[2,10],[1,10],[0,10],[-1,10],[-2,10],[-3,10],[-4,10],[-5,12],[-6,12],[-7,14],[-8,14],[-9,14],[-10,14],[-11,16],[-12,17],[-13,18],[-14,20],[-15,22],[-16,24],[-18,26],[-20,26],[-22,28],[-24,28],[-26,28],[-28,28],[-29,28],[-30,30],[-31,30],[-32,28],[-33,27],[-34,24],[-35,20],[-34,18],[-33,18],[-32,18],[-30,16],[-28,15],[-26,14],[-24,14],[-22,14],[-20,12],[-18,12],[-16,12],[-14,14],[-12,16],[-10,20],[-8,24],[-6,28],[-4,34],[-2,38],[0,42],[2,42],[4,42],[6,42],[8,42],[10,42],[12,44],[13,46],[14,48],[14,46],[12,44],[12,42],[14,40],[16,38],[18,36],[20,36],[22,38],[24,36],[26,36],[28,34],[30,32],[32,30],[34,28],[36,24],[37,18],[37,14],[37,10],
      // Asia
      [42,30],[44,34],[46,38],[48,40],[50,42],[52,44],[54,48],[56,52],[58,56],[60,60],[62,64],[64,68],[66,70],[68,70],[70,70],[72,72],[74,78],[75,84],[75,90],[74,98],[72,106],[70,110],[68,120],[66,130],[64,136],[62,140],[60,136],[58,138],[56,140],[54,138],[52,136],[50,134],[48,132],[46,132],[44,130],[42,130],[40,128],[38,126],[36,126],[34,124],[32,122],[30,122],[28,120],[26,118],[24,116],[22,114],[20,112],[18,110],[16,108],[14,106],[12,102],[10,98],[10,94],[12,88],[14,82],[16,78],[18,72],[20,66],[22,60],[24,56],[26,52],[28,48],[30,46],[32,42],[34,38],[36,34],[38,32],[40,30],[42,30],
      // Australia
      [-12,130],[-14,132],[-16,134],[-18,136],[-20,140],[-22,144],[-24,148],[-26,150],[-28,153],[-30,153],[-32,152],[-34,151],[-36,148],[-38,146],[-38,144],[-37,142],[-36,140],[-36,138],[-34,136],[-33,134],[-32,132],[-30,130],[-28,128],[-26,126],[-24,124],[-22,122],[-20,120],[-18,118],[-16,120],[-14,124],[-12,128],[-12,130],
      // Greenland
      [60,-44],[62,-42],[64,-40],[66,-38],[68,-34],[70,-28],[72,-24],[74,-20],[76,-22],[78,-24],[80,-30],[82,-34],[82,-40],[80,-48],[78,-54],[76,-58],[74,-60],[72,-58],[70,-55],[68,-52],[66,-50],[64,-48],[62,-46],[60,-44],
      // UK + Ireland
      [50,-6],[51,-5],[52,-4],[53,-3],[54,-3],[55,-4],[56,-5],[57,-5],[58,-4],[59,-3],[58,-3],[57,-2],[56,-1],[55,0],[54,-1],[53,-1],[52,-1],[51,-2],[50,-4],[50,-6],
      // Japan
      [31,131],[33,130],[34,131],[35,133],[36,136],[37,137],[38,139],[39,140],[40,140],[41,141],[42,143],[43,145],[44,144],[43,142],[42,141],[40,140],[39,139],[37,137],[36,136],[35,135],[34,134],[33,132],[32,131],[31,131],
      // Indonesia
      [-6,106],[-7,107],[-8,110],[-8,113],[-7,115],[-8,116],[-8,114],[-7,112],[-6,110],[-5,108],[-5,106],[-6,106],
      // New Zealand
      [-35,174],[-36,175],[-38,176],[-40,176],[-42,172],[-44,170],[-46,168],[-46,167],[-45,167],[-44,169],[-42,171],[-40,174],[-38,176],[-37,175],[-35,174],
    ];

    // Cities
    const cities: [number, number, number][] = [
      [40.71,-74.01,10],[34.05,-118.24,9],[41.88,-87.63,8],[29.76,-95.37,8],[33.45,-112.07,7],
      [39.95,-75.17,7],[29.42,-98.49,6],[32.78,-96.80,7],[37.34,-121.89,7],[47.61,-122.33,6],
      [38.91,-77.04,6],[42.36,-71.06,6],[33.75,-84.39,6],[25.76,-80.19,7],[39.74,-104.99,5],
      [44.98,-93.27,5],[32.72,-117.16,6],[48.43,-123.37,4],[45.50,-73.57,6],[43.65,-79.38,7],
      [51.05,-114.07,4],[49.28,-123.12,5],[19.43,-99.13,10],[23.13,-82.38,5],[9.93,-84.08,3],
      [-23.55,-46.63,10],[-34.60,-58.38,9],[-22.91,-43.17,8],[-33.45,-70.65,7],[-12.05,-77.04,7],
      [-4.44,-63.07,5],[-3.74,-38.52,6],[10.48,-66.90,6],[4.71,-74.07,6],[-0.18,-78.47,5],
      [-15.78,-47.93,6],[-34.88,-56.17,4],[-1.83,-78.18,3],[-16.50,-68.15,4],
      [51.51,-0.13,10],[48.86,2.35,9],[52.52,13.41,7],[40.42,-3.70,8],[41.90,12.50,7],
      [52.37,4.90,6],[50.85,4.35,5],[50.11,8.68,6],[48.21,16.37,5],[47.50,19.04,5],
      [59.33,18.07,5],[55.68,12.57,4],[60.17,24.94,4],[52.23,21.01,5],[50.08,14.44,4],
      [53.35,-6.26,4],[55.95,-3.19,4],[53.48,-2.24,5],[45.46,9.19,5],[43.30,5.37,4],
      [41.39,2.17,6],[38.72,-9.14,4],[59.91,10.75,4],[37.98,23.73,5],[42.70,23.32,3],
      [44.43,26.10,4],[45.81,15.98,3],[41.33,19.82,3],[40.18,44.51,3],
      [-26.20,28.05,7],[30.04,31.24,9],[6.52,3.38,8],[-1.29,36.82,5],[33.59,-7.59,5],
      [5.56,-0.19,4],[36.75,3.04,5],[-4.27,15.27,5],[-6.79,39.28,4],[9.02,38.75,4],
      [12.05,-1.53,3],[15.50,32.56,4],[14.69,-17.44,4],[-25.97,32.57,3],[-15.39,28.32,3],
      [-33.93,18.42,4],[-29.86,31.02,3],[0.35,32.58,3],[11.56,43.15,2],[-18.87,47.51,3],
      [25.28,51.52,5],[24.47,54.37,5],[25.21,55.27,7],[21.49,39.19,6],[35.69,51.39,9],
      [41.01,28.98,9],[33.31,44.37,7],[33.89,35.50,4],[31.95,35.93,4],[32.08,34.78,5],
      [19.08,72.88,10],[28.61,77.21,10],[13.08,80.27,8],[22.57,88.36,8],[12.97,77.59,8],
      [17.38,78.49,7],[23.02,72.57,6],[26.85,80.95,5],[21.17,72.83,5],[23.81,90.41,9],
      [27.70,85.32,4],[24.86,67.01,6],[33.69,73.04,6],[6.93,79.85,4],
      [35.68,139.69,10],[31.23,121.47,10],[39.90,116.40,10],[22.32,114.17,9],[23.13,113.26,9],
      [30.57,104.07,8],[34.26,108.94,6],[22.55,108.32,5],[29.87,121.55,6],[37.57,126.98,9],
      [14.60,120.98,9],[1.35,103.82,7],[13.75,100.50,8],[21.03,105.85,7],[6.21,106.85,9],
      [3.14,101.69,6],[35.18,136.91,6],[34.69,135.50,8],[43.06,141.35,4],[16.87,96.20,5],
      [11.56,104.92,4],[17.97,102.63,3],[-6.21,106.85,9],
      [-33.87,151.21,7],[-37.81,144.96,6],[-27.47,153.03,4],[-31.95,115.86,3],
      [-34.93,138.60,3],[-36.85,174.76,3],[-41.29,174.78,2],
      [55.76,37.62,9],[59.93,30.32,5],[56.84,60.60,3],[55.03,82.93,3],[54.99,73.37,2],
      [51.13,71.43,3],[41.31,69.28,4],[43.24,76.95,3],[38.56,68.77,3],
    ];

    // Build earth points from cities
    const earthPts: Array<{ lat: number; lng: number; sz: number; b: number; land: boolean }> = [];
    for (let ci = 0; ci < cities.length; ci++) {
      const city = cities[ci];
      const weight = city[2];
      const dotCount = Math.round(weight * 2.5);
      const spread = 1.5 + weight * 0.6;
      for (let j = 0; j < dotCount; j++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * spread;
        const dlat = Math.cos(angle) * dist;
        const dlng = Math.sin(angle) * dist / (Math.cos(city[0] * Math.PI / 180) || 0.5);
        const distFade = 1 - dist / spread;
        earthPts.push({
          lat: city[0] + dlat,
          lng: city[1] + dlng,
          sz: 0.3 + distFade * 0.8,
          b: (0.3 + weight * 0.07) * distFade,
          land: true,
        });
      }
      earthPts.push({ lat: city[0], lng: city[1], sz: 0.6 + weight * 0.1, b: 0.4 + weight * 0.06, land: true });
    }
    // Sparse ocean scatter
    for (let si = 0; si < 200; si++) {
      earthPts.push({
        lat: Math.asin(Math.random() * 2 - 1) * 180 / Math.PI,
        lng: Math.random() * 360 - 180,
        sz: 0.1 + Math.random() * 0.12,
        b: 0.015 + Math.random() * 0.025,
        land: false,
      });
    }

    // Data centers
    const dcs = [
      { lat: 52.37, lng: 4.90, name: 'Amsterdam', label: true },
      { lat: 39.04, lng: -77.49, name: 'Ashburn', label: false },
      { lat: 33.75, lng: -84.39, name: 'Atlanta', label: true },
      { lat: 41.88, lng: -87.63, name: 'Chicago', label: true },
      { lat: 32.78, lng: -96.80, name: 'Dallas', label: true },
      { lat: 39.74, lng: -104.99, name: 'Denver', label: false },
      { lat: 50.11, lng: 8.68, name: 'Frankfurt', label: true },
      { lat: 22.32, lng: 114.17, name: 'Hong Kong', label: true },
      { lat: -26.20, lng: 28.05, name: 'Johannesburg', label: true },
      { lat: 51.51, lng: -0.13, name: 'London', label: true },
      { lat: 34.05, lng: -118.24, name: 'Los Angeles', label: true },
      { lat: 40.42, lng: -3.70, name: 'Madrid', label: false },
      { lat: 25.76, lng: -80.19, name: 'Miami', label: true },
      { lat: 45.46, lng: 9.19, name: 'Milan', label: false },
      { lat: 19.08, lng: 72.88, name: 'Mumbai', label: true },
      { lat: 40.71, lng: -74.01, name: 'New York', label: true },
      { lat: 34.69, lng: 135.50, name: 'Osaka', label: false },
      { lat: 48.86, lng: 2.35, name: 'Paris', label: true },
      { lat: 37.34, lng: -121.89, name: 'San Jose', label: false },
      { lat: -23.55, lng: -46.63, name: 'São Paulo', label: true },
      { lat: 47.61, lng: -122.33, name: 'Seattle', label: true },
      { lat: 1.35, lng: 103.82, name: 'Singapore', label: true },
      { lat: 59.33, lng: 18.07, name: 'Stockholm', label: false },
      { lat: -33.87, lng: 151.21, name: 'Sydney', label: true },
      { lat: 35.68, lng: 139.69, name: 'Tokyo', label: true },
      { lat: 43.65, lng: -79.38, name: 'Toronto', label: false },
      { lat: 48.21, lng: 16.37, name: 'Vienna', label: false },
    ];

    // Arcs
    const arcPairs = [
      [1,15],[1,25],[15,3],[3,4],[4,5],[5,10],[10,18],[18,20],[4,12],[12,2],[2,3],
      [19,12],[19,8],
      [0,6],[0,9],[6,17],[17,11],[13,26],[22,6],[9,17],[11,13],[26,22],
      [14,21],[21,7],[7,24],[24,16],[21,23],[14,8],
      [9,1],[0,15],[10,24],[6,14],
    ];
    const arcs: Array<{ from: number; to: number; packets: Array<{ t: number; speed: number }> }> = [];
    for (let ap = 0; ap < arcPairs.length; ap++) {
      arcs.push({ from: arcPairs[ap][0], to: arcPairs[ap][1], packets: [] });
    }

    // Moon
    let moonAngle = 0.4;

    // Background stars
    const bgStars: Array<{ x: number; y: number; r: number; o: number; tw: number }> = [];
    for (let bs = 0; bs < 160; bs++) {
      bgStars.push({
        x: Math.random() * 3000,
        y: Math.random() * 3000,
        r: 0.2 + Math.random() * 0.5,
        o: 0.03 + Math.random() * 0.08,
        tw: Math.random() * 6,
      });
    }

    // Shooting stars
    const shootingStars: Array<{ x: number; y: number; vx: number; vy: number; life: number; decay: number; len: number }> = [];
    function spawnStar() {
      shootingStars.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.35,
        vx: Math.cos(0.2) * 7,
        vy: Math.sin(0.2) * 7,
        life: 1,
        decay: 0.015 + Math.random() * 0.015,
        len: 35 + Math.random() * 40,
      });
    }

    function toS(lat: number, lng: number, r: number) {
      const la2 = lat * Math.PI / 180;
      const lo2 = (lng + rotation) * Math.PI / 180;
      const x = r * Math.cos(la2) * Math.sin(lo2);
      const y = -r * Math.sin(la2);
      const z = r * Math.cos(la2) * Math.cos(lo2);
      const x2 = x * Math.cos(tiltX) - z * Math.sin(tiltX);
      const z2 = x * Math.sin(tiltX) + z * Math.cos(tiltX);
      const y2 = y * Math.cos(tiltY) - z2 * Math.sin(tiltY);
      const z3 = y * Math.sin(tiltY) + z2 * Math.cos(tiltY);
      return { x: x2 + cx, y: y2 + cy, z: z3, v: (z3 + r) / (r * 2) };
    }

    // Earth texture — keep the source canvas alive to prevent GC issues
    let earthReady = false;
    let earthPixels: Uint8ClampedArray | null = null;
    let earthTexW = 0;
    let earthTexH = 0;
    const earthSourceCanvas = document.createElement('canvas');
    const earthTex = new Image();
    earthTex.crossOrigin = 'anonymous';
    earthTex.src = '/assets/images/2k_earth_nightmap.jpg';
    earthTex.onload = function () {
      earthSourceCanvas.width = earthTex.width;
      earthSourceCanvas.height = earthTex.height;
      const octx = earthSourceCanvas.getContext('2d')!;
      octx.drawImage(earthTex, 0, 0);
      const imgData = octx.getImageData(0, 0, earthSourceCanvas.width, earthSourceCanvas.height);
      // Make a standalone copy of pixel data
      const pixelsCopy = new Uint8ClampedArray(imgData.data.length);
      pixelsCopy.set(imgData.data);
      earthPixels = pixelsCopy;
      earthTexW = earthSourceCanvas.width;
      earthTexH = earthSourceCanvas.height;
      earthReady = true;
    };

    // DC label alpha
    let dcLabelAlpha = 0;
    let dcLabelsActive = false;

    // Pre-create the offscreen canvas for earth rendering
    const earthOC = document.createElement('canvas');
    const earthOCCtx = earthOC.getContext('2d')!;
    let lastEarthSize = 0;
    let time = 0;

    function draw() {
      time += 0.016;
      if (!isDragging) rotation += 0.03;
      const moonOrbitR = globeR * 2.4;
      const moonR2 = globeR * 0.18;
      moonAngle += 0.0006;
      ctx!.clearRect(0, 0, w, h);

      // Background stars
      for (let bsi = 0; bsi < bgStars.length; bsi++) {
        const s = bgStars[bsi];
        ctx!.beginPath();
        ctx!.arc(s.x % w, s.y % h, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = 'rgba(200,220,255,' + (s.o + Math.sin(time + s.tw) * 0.02) + ')';
        ctx!.fill();
      }

      // Shooting stars
      if (Math.random() < 0.004) spawnStar();
      for (let ssi = shootingStars.length - 1; ssi >= 0; ssi--) {
        const ss = shootingStars[ssi];
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.life -= ss.decay;
        if (ss.life <= 0) { shootingStars.splice(ssi, 1); continue; }
        ctx!.beginPath();
        ctx!.moveTo(ss.x, ss.y);
        ctx!.lineTo(ss.x - ss.vx * (ss.len / 8), ss.y - ss.vy * (ss.len / 8));
        const sg = ctx!.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * (ss.len / 8), ss.y - ss.vy * (ss.len / 8));
        sg.addColorStop(0, 'rgba(255,255,255,' + (ss.life * 0.4) + ')');
        sg.addColorStop(1, 'transparent');
        ctx!.strokeStyle = sg;
        ctx!.lineWidth = ss.life;
        ctx!.stroke();
      }

      // Moon
      const mX = cx + Math.cos(moonAngle) * moonOrbitR * 0.45;
      const mY = cy - moonOrbitR * 0.2 + Math.sin(moonAngle) * moonOrbitR * 0.08;
      const mDx = mX - cx, mDy = mY - cy;
      const mDist = Math.sqrt(mDx * mDx + mDy * mDy);
      const moonVisible = mDist > globeR - moonR2;

      if (moonVisible) {
        ctx!.save();
        ctx!.beginPath();
        ctx!.rect(0, 0, w, h);
        ctx!.arc(cx, cy, globeR, 0, Math.PI * 2, true);
        ctx!.clip();

        ctx!.beginPath();
        const mGlow1 = ctx!.createRadialGradient(mX, mY, moonR2 * 0.3, mX, mY, moonR2 * 5);
        mGlow1.addColorStop(0, 'rgba(160,170,200,.02)');
        mGlow1.addColorStop(0.3, 'rgba(140,150,180,.012)');
        mGlow1.addColorStop(1, 'transparent');
        ctx!.fillStyle = mGlow1;
        ctx!.arc(mX, mY, moonR2 * 5, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.beginPath();
        const mGlow2 = ctx!.createRadialGradient(mX, mY, moonR2 * 0.6, mX, mY, moonR2 * 2.2);
        mGlow2.addColorStop(0, 'rgba(200,210,230,.04)');
        mGlow2.addColorStop(0.5, 'rgba(180,190,215,.02)');
        mGlow2.addColorStop(1, 'transparent');
        ctx!.fillStyle = mGlow2;
        ctx!.arc(mX, mY, moonR2 * 2.2, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.beginPath();
        const mSurf = ctx!.createRadialGradient(mX - moonR2 * 0.3, mY - moonR2 * 0.25, moonR2 * 0.08, mX + moonR2 * 0.1, mY + moonR2 * 0.1, moonR2);
        mSurf.addColorStop(0, 'rgba(230,232,240,.18)');
        mSurf.addColorStop(0.3, 'rgba(210,215,225,.14)');
        mSurf.addColorStop(0.6, 'rgba(180,185,200,.09)');
        mSurf.addColorStop(0.85, 'rgba(130,135,155,.05)');
        mSurf.addColorStop(1, 'rgba(80,85,105,.015)');
        ctx!.fillStyle = mSurf;
        ctx!.arc(mX, mY, moonR2, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(mX, mY, moonR2, 0, Math.PI * 2);
        ctx!.strokeStyle = 'rgba(200,210,230,.06)';
        ctx!.lineWidth = 1;
        ctx!.stroke();

        const craters = [[-0.25, -0.18, 0.2], [0.18, 0.12, 0.14], [-0.08, 0.22, 0.1], [0.28, -0.18, 0.08], [-0.32, 0.06, 0.07], [0.05, -0.28, 0.06]];
        for (let cr = 0; cr < craters.length; cr++) {
          ctx!.beginPath();
          ctx!.arc(mX + craters[cr][0] * moonR2, mY + craters[cr][1] * moonR2, craters[cr][2] * moonR2, 0, Math.PI * 2);
          ctx!.fillStyle = 'rgba(90,95,120,.04)';
          ctx!.fill();
          ctx!.strokeStyle = 'rgba(140,145,170,.02)';
          ctx!.lineWidth = 0.5;
          ctx!.stroke();
        }

        ctx!.restore();
      }

      // Globe atmospheric glow
      const grd1 = ctx!.createRadialGradient(cx, cy, globeR * 0.8, cx, cy, globeR * 1.4);
      grd1.addColorStop(0, 'rgba(37,99,235,.025)');
      grd1.addColorStop(1, 'transparent');
      ctx!.fillStyle = grd1;
      ctx!.fillRect(cx - globeR * 2, cy - globeR * 2, globeR * 4, globeR * 4);

      // Globe base
      ctx!.beginPath();
      ctx!.arc(cx, cy, globeR, 0, Math.PI * 2);
      ctx!.fillStyle = '#020408';
      ctx!.fill();

      // Earth texture rendering — cap resolution for performance
      if (earthReady && earthPixels && earthPixels.length > 0) {
        const eD = earthPixels;
        const eW = earthTexW;
        const eH = earthTexH;
        const maxRes = 600; // cap pixel rendering resolution
        const rawD2 = Math.ceil(globeR * 2);
        const d2 = Math.min(rawD2, maxRes);
        const scale = rawD2 / d2;
        const imgData = ctx!.createImageData(d2, d2);
        const sampleR = d2 / 2;
        const pix = imgData.data;
        const sdx2 = -0.55, sdy2 = -0.5, sdz2 = 0.67;
        const sln = Math.sqrt(sdx2 * sdx2 + sdy2 * sdy2 + sdz2 * sdz2);
        const nsdx = sdx2 / sln, nsdy = sdy2 / sln, nsdz = sdz2 / sln;
        const rotR2 = rotation * Math.PI / 180;
        const cT = Math.cos(tiltY), sT = Math.sin(tiltY);

        for (let py2 = 0; py2 < d2; py2++) {
          const syN = (py2 - sampleR) / sampleR;
          if (syN < -1 || syN > 1) continue;
          for (let px2 = 0; px2 < d2; px2++) {
            const sxN = (px2 - sampleR) / sampleR;
            const r2 = sxN * sxN + syN * syN;
            if (r2 >= 1) continue;
            const szN = Math.sqrt(1 - r2);
            const y0 = syN * cT + szN * sT;
            const z2v = -syN * sT + szN * cT;
            const x0 = sxN;
            const lat3 = Math.asin(-(y0 > 1 ? 1 : y0 < -1 ? -1 : y0)) * 180 / Math.PI;
            const lo2 = Math.atan2(x0, z2v) * 180 / Math.PI;
            const lng3 = lo2 - rotation;
            // Proper modulo wrapping for continuous rotation
            let tx3 = (((lng3 + 180) % 360 + 360) % 360) / 360 * eW | 0;
            let ty3 = ((90 - lat3) / 180 * eH) | 0;
            if (tx3 >= eW) tx3 = eW - 1;
            if (ty3 < 0) ty3 = 0; if (ty3 >= eH) ty3 = eH - 1;
            const ti2 = (ty3 * eW + tx3) * 4;
            let sf2 = sxN * nsdx + syN * nsdy + szN * nsdz;
            sf2 = sf2 < 0 ? 0 : sf2;
            sf2 = 0.15 + sf2 * 0.85;
            const idx2 = (py2 * d2 + px2) * 4;
            pix[idx2] = Math.min(255, (eD[ti2] * sf2 * 0.9) | 0);
            pix[idx2 + 1] = Math.min(255, (eD[ti2 + 1] * sf2 * 0.95) | 0);
            pix[idx2 + 2] = Math.min(255, (eD[ti2 + 2] * sf2 * 1.1) | 0);
            pix[idx2 + 3] = 255;
          }
        }

        // Only resize the offscreen canvas when globe size changes
        if (lastEarthSize !== d2) {
          earthOC.width = d2;
          earthOC.height = d2;
          lastEarthSize = d2;
        }
        earthOCCtx.putImageData(imgData, 0, 0);
        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(cx, cy, globeR, 0, Math.PI * 2);
        ctx!.clip();
        // Scale up if we rendered at lower resolution
        ctx!.drawImage(earthOC, 0, 0, d2, d2, cx - globeR, cy - globeR, globeR * 2, globeR * 2);
        ctx!.restore();
      }

      // Specular highlight
      ctx!.beginPath();
      const sp = ctx!.createRadialGradient(cx - globeR * 0.4, cy - globeR * 0.4, 0, cx - globeR * 0.4, cy - globeR * 0.4, globeR * 0.3);
      sp.addColorStop(0, 'rgba(200,225,255,.05)');
      sp.addColorStop(0.5, 'rgba(160,200,240,.02)');
      sp.addColorStop(1, 'transparent');
      ctx!.fillStyle = sp;
      ctx!.arc(cx - globeR * 0.4, cy - globeR * 0.4, globeR * 0.3, 0, Math.PI * 2);
      ctx!.fill();

      // Atmospheric rim
      ctx!.beginPath();
      ctx!.arc(cx, cy, globeR - 0.5, Math.PI * 0.85, Math.PI * 1.55);
      ctx!.strokeStyle = 'rgba(120,160,220,.05)';
      ctx!.lineWidth = 1.5;
      ctx!.stroke();

      // Subtle outline
      ctx!.beginPath();
      ctx!.arc(cx, cy, globeR, 0, Math.PI * 2);
      ctx!.strokeStyle = 'rgba(59,130,246,.08)';
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // Data center nodes + labels
      if (dcLabelsActive) dcLabelAlpha = Math.min(1, dcLabelAlpha + 0.008);

      for (let di = 0; di < dcs.length; di++) {
        const dp = toS(dcs[di].lat, dcs[di].lng, globeR);
        if (dp.v < 0.18) continue;
        const da = Math.pow(dp.v, 1.2);
        const pulse = 1 + Math.sin(time * 2 + di * 1.3) * 0.15;

        ctx!.beginPath();
        ctx!.arc(dp.x, dp.y, 14 * da * pulse, 0, Math.PI * 2);
        ctx!.fillStyle = 'rgba(59,130,246,' + (da * 0.05) + ')';
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(dp.x, dp.y, 3 * da, 0, Math.PI * 2);
        ctx!.fillStyle = 'rgba(200,230,255,' + (da * 0.85) + ')';
        ctx!.fill();

        if (dcs[di].label && dp.v > 0.55 && dcLabelAlpha > 0) {
          const labelA = da * dcLabelAlpha * (dp.v - 0.55) / 0.45;
          ctx!.font = '500 9px Inter,system-ui,sans-serif';
          ctx!.textAlign = 'center';
          ctx!.fillStyle = 'rgba(180,210,255,' + (labelA * 0.55) + ')';
          ctx!.fillText(dcs[di].name, dp.x, dp.y - 10 * da);
        }
      }

      // Data arcs
      for (let ak = 0; ak < arcs.length; ak++) {
        const arc = arcs[ak];
        const fP = toS(dcs[arc.from].lat, dcs[arc.from].lng, globeR);
        const tP = toS(dcs[arc.to].lat, dcs[arc.to].lng, globeR);
        if (fP.v < 0.2 && tP.v < 0.2) continue;
        const mLat = (dcs[arc.from].lat + dcs[arc.to].lat) / 2;
        const mLng = (dcs[arc.from].lng + dcs[arc.to].lng) / 2;
        const mP = toS(mLat, mLng, globeR * 1.15);
        const lineA = Math.min(fP.v, tP.v);

        ctx!.beginPath();
        ctx!.moveTo(fP.x, fP.y);
        ctx!.quadraticCurveTo(mP.x, mP.y, tP.x, tP.y);
        ctx!.strokeStyle = 'rgba(59,130,246,' + (lineA * 0.04) + ')';
        ctx!.lineWidth = 0.5;
        ctx!.stroke();

        if (arc.packets.length === 0 && Math.random() < 0.01) arc.packets.push({ t: 0, speed: 0.006 + Math.random() * 0.005 });
        for (let pk = arc.packets.length - 1; pk >= 0; pk--) {
          const pkt = arc.packets[pk];
          pkt.t += pkt.speed;
          if (pkt.t > 1.3) { arc.packets.splice(pk, 1); continue; }

          const segLen = 0.35;
          const tHead = Math.min(pkt.t, 1);
          const tTail = Math.max(tHead - segLen, 0);
          const steps = 24;
          const segAlpha = pkt.t < 0.15 ? pkt.t / 0.15 : pkt.t > 1 ? (1.3 - pkt.t) / 0.3 : 1;

          const pts: Array<{ x: number; y: number; t: number }> = [];
          for (let si = 0; si <= steps; si++) {
            const st = tTail + (tHead - tTail) * (si / steps);
            pts.push({
              x: (1 - st) * (1 - st) * fP.x + 2 * (1 - st) * st * mP.x + st * st * tP.x,
              y: (1 - st) * (1 - st) * fP.y + 2 * (1 - st) * st * mP.y + st * st * tP.y,
              t: si / steps,
            });
          }

          for (let si2 = 0; si2 < pts.length - 1; si2++) {
            const p1 = pts[si2], p2 = pts[si2 + 1];
            const prog = si2 / (pts.length - 1);
            const thick = 0.4 + prog * prog * 2.8;
            const alpha = prog * prog * segAlpha * lineA;

            ctx!.beginPath();
            ctx!.moveTo(p1.x, p1.y);
            ctx!.lineTo(p2.x, p2.y);
            ctx!.strokeStyle = 'rgba(150,210,255,' + (alpha * 0.4) + ')';
            ctx!.lineWidth = thick;
            ctx!.lineCap = 'round';
            ctx!.stroke();

            ctx!.beginPath();
            ctx!.moveTo(p1.x, p1.y);
            ctx!.lineTo(p2.x, p2.y);
            ctx!.strokeStyle = 'rgba(59,130,246,' + (alpha * 0.08) + ')';
            ctx!.lineWidth = thick + 5;
            ctx!.lineCap = 'round';
            ctx!.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }
    draw();

    // Metric cards + trust text reveal
    const reqEl = document.getElementById('ig-req-val');
    const reqTarget = Math.floor(Math.random() * 800000) + 1200000;
    let reqCur = 0;
    let reqInterval: ReturnType<typeof setInterval> | null = null;
    let countAnimId: number | null = null;

    function fmtN(n: number) {
      return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    function countUp() {
      if (reqCur < reqTarget) {
        reqCur = Math.min(reqCur + Math.ceil((reqTarget - reqCur) / 70), reqTarget);
        if (reqEl) reqEl.textContent = fmtN(reqCur);
        countAnimId = requestAnimationFrame(countUp);
      } else {
        let dynamicTarget = reqTarget;
        reqInterval = setInterval(() => {
          dynamicTarget += Math.floor(Math.random() * 15) + 4;
          reqCur = dynamicTarget;
          if (reqEl) reqEl.textContent = fmtN(reqCur);
        }, 900);
      }
    }

    const igWrap = document.getElementById('ig-wrap');
    let igFired = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const igObserver = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || igFired) return;
        igFired = true;
        ['igf1', 'igf2', 'igf3', 'igf4'].forEach((id, i) => {
          timeouts.push(setTimeout(() => {
            document.getElementById(id)?.classList.add('show');
          }, 500 + i * 200));
        });
        timeouts.push(setTimeout(countUp, 1200));
        timeouts.push(setTimeout(() => { dcLabelsActive = true; }, 800));
        timeouts.push(setTimeout(() => {
          document.getElementById('ig-trust')?.classList.add('show');
        }, 2000));
        timeouts.push(setTimeout(() => {
          document.querySelector('.ig-status-inner')?.classList.add('show');
        }, 2200));
      },
      { threshold: 0.1 }
    );

    if (igWrap) igObserver.observe(igWrap);

    return () => {
      cancelAnimationFrame(animId);
      if (countAnimId) cancelAnimationFrame(countAnimId);
      if (reqInterval) clearInterval(reqInterval);
      timeouts.forEach(clearTimeout);
      igObserver.disconnect();
      window.removeEventListener('resize', onResize);
      canvas!.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      // Clean up strip stars
      if (strip) {
        while (strip.firstChild) strip.removeChild(strip.firstChild);
      }
    };
  }, []);

  return (
    <>
      {/* wp.cloud header */}
      <div className="c" style={{ position: 'relative', zIndex: 10, textAlign: 'center', marginBottom: 0 }}>
        <div
          style={{
            display: 'inline-block',
            fontSize: '.7rem',
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '3px',
            color: '#3b82f6',
            marginBottom: '14px',
          }}
        >
          wp.cloud
        </div>
        <h2 className="ig-hdr-title">
          The infrastructure behind<br />the simplicity
        </h2>
      </div>

      {/* Globe canvas */}
      <div className="infra-globe" id="infra-globe">
        {/* Blue gradient strip behind globe */}
        <div
          id="globe-strip"
          ref={stripRef}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '35%',
            transform: 'translateY(-50%)',
            height: '550px',
            background:
              'linear-gradient(180deg,transparent 0%,rgba(5,21,48,.4) 35%,rgba(6,26,56,.55) 50%,rgba(5,21,48,.4) 65%,transparent 100%)',
            pointerEvents: 'none',
            zIndex: 0,
            overflow: 'hidden',
          }}
        />

        <canvas id="infra-globe-canvas" ref={canvasRef} />
      </div>

      {/* Badges + trust + status */}
      <div className="c" style={{ position: 'relative', zIndex: 10 }}>
        <div className="ig-wrap" id="ig-wrap">
          <div className="ig-fm ig-fm-1" id="igf1">
            <div className="ig-fm-card">
              <div className="ig-fm-val">
                99.99<span>%</span>
              </div>
              <div className="ig-fm-label">Uptime SLA</div>
            </div>
          </div>
          <div className="ig-fm ig-fm-2" id="igf2">
            <div className="ig-fm-card">
              <div className="ig-fm-val">
                &lt;142<span>ms</span>
              </div>
              <div className="ig-fm-label">Response Time</div>
            </div>
          </div>
          <div className="ig-fm ig-fm-3" id="igf3">
            <div className="ig-fm-card">
              <div className="ig-fm-val">
                28<span>+</span>
              </div>
              <div className="ig-fm-label">Edge Locations</div>
            </div>
          </div>
          <div className="ig-fm ig-fm-4" id="igf4">
            <div className="ig-fm-card">
              <div className="ig-fm-val" id="ig-req-val">
                0
              </div>
              <div className="ig-fm-label">Requests Today</div>
            </div>
          </div>
        </div>

        <div className="ig-trust" id="ig-trust">
          <p>
            Your site runs on <em>wp.cloud</em> — 28 edge locations, sub-150ms response times, and
            99.99% uptime backed by the same platform that powers{' '}
            <strong>WordPress.com</strong> and <strong>WordPress VIP</strong>.
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="ig-status" id="ig-status">
            <div className="ig-status-inner">
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 8px rgba(34,197,94,.5)',
                  animation: 'dotPulse 2s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: '.56rem',
                  color: '#86efac',
                  letterSpacing: '.5px',
                }}
              >
                All systems operational
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

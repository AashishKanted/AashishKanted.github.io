document.addEventListener('DOMContentLoaded', () => {

    // ---- Theme Toggle ----
    const toggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    toggle.addEventListener('click', () => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        if (isLight) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });

    // ---- Scroll Reveal (Intersection Observer) ----
    const reveals = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
        let delay = 0;
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.transitionDelay = `${delay}ms`;
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
                delay += 100;
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
    });

    reveals.forEach(el => observer.observe(el));

    // ---- Navbar scroll effect ----
    const nav = document.getElementById('nav');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 80) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }, { passive: true });

    // ---- Smooth scroll for anchor links ----
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // ---- Active nav link highlighting ----
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    const highlightNav = () => {
        const scrollY = window.scrollY + 120;
        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');

            if (scrollY >= top && scrollY < top + height) {
                navLinks.forEach(link => {
                    link.style.color = '';
                    if (link.getAttribute('href') === `#${id}`) {
                        link.style.color = 'var(--text-primary)';
                    }
                });
            }
        });
    };

    window.addEventListener('scroll', highlightNav, { passive: true });

    // ---- Hero Canvas: RViz-style robot paths ----
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
        initHeroCanvas();
        initParallax();
    }

});

// ---- Hero Canvas Animation ----
function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let w, h;
    let animationId;

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        w = canvas.width = rect.width;
        h = canvas.height = rect.height;
    }

    resize();
    window.addEventListener('resize', resize);

    // Define robot trajectory paths as bezier curves
    const paths = [
        {
            points: [
                { x: 0.05, y: 0.7 },
                { x: 0.2, y: 0.3 },
                { x: 0.45, y: 0.6 },
                { x: 0.65, y: 0.25 },
                { x: 0.85, y: 0.5 },
                { x: 0.95, y: 0.3 }
            ],
            color: 'accent',
            width: 1.5,
            opacity: 0.1
        },
        {
            points: [
                { x: 0.1, y: 0.85 },
                { x: 0.3, y: 0.55 },
                { x: 0.5, y: 0.75 },
                { x: 0.7, y: 0.45 },
                { x: 0.9, y: 0.65 }
            ],
            color: 'accent',
            width: 1,
            opacity: 0.07
        },
        {
            points: [
                { x: 0.15, y: 0.2 },
                { x: 0.35, y: 0.45 },
                { x: 0.55, y: 0.15 },
                { x: 0.75, y: 0.55 },
                { x: 0.95, y: 0.2 }
            ],
            color: 'accent',
            width: 1,
            opacity: 0.06
        }
    ];

    // Grid settings
    const gridSpacing = 60;
    const gridOpacity = 0.075;

    // Robot dot that moves along the first path
    let robotT = 0;
    const robotSpeed = 0.0004;

    function getAccentColor() {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        return isLight ? '176, 141, 79' : '201, 169, 110';
    }

    // Interpolate along a polyline path at parameter t (0..1)
    function getPointOnPath(points, t) {
        const totalSegments = points.length - 1;
        const segT = t * totalSegments;
        const segIndex = Math.min(Math.floor(segT), totalSegments - 1);
        const localT = segT - segIndex;

        const p0 = points[Math.max(segIndex - 1, 0)];
        const p1 = points[segIndex];
        const p2 = points[Math.min(segIndex + 1, totalSegments)];
        const p3 = points[Math.min(segIndex + 2, totalSegments)];

        // Catmull-Rom spline interpolation for smooth curves
        const tt = localT;
        const tt2 = tt * tt;
        const tt3 = tt2 * tt;

        const x = 0.5 * (
            (2 * p1.x) +
            (-p0.x + p2.x) * tt +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tt2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * tt3
        );

        const y = 0.5 * (
            (2 * p1.y) +
            (-p0.y + p2.y) * tt +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tt2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * tt3
        );

        return { x, y };
    }

    function drawGrid() {
        const accent = getAccentColor();
        ctx.strokeStyle = `rgba(${accent}, ${gridOpacity})`;
        ctx.lineWidth = 0.5;

        // Vertical lines
        for (let x = 0; x < w; x += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y < h; y += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    }

    function drawPaths() {
        const accent = getAccentColor();

        paths.forEach(path => {
            const pts = path.points;

            // Draw smooth curve through points
            ctx.strokeStyle = `rgba(${accent}, ${path.opacity})`;
            ctx.lineWidth = path.width;
            ctx.beginPath();

            const steps = 100;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const pt = getPointOnPath(pts, t);
                const px = pt.x * w;
                const py = pt.y * h;
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.stroke();

            // Draw waypoints
            pts.forEach(pt => {
                const px = pt.x * w;
                const py = pt.y * h;

                // Outer ring
                ctx.beginPath();
                ctx.arc(px, py, 4, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${accent}, ${path.opacity * 1.5})`;
                ctx.lineWidth = 1;
                ctx.stroke();

                // Inner dot
                ctx.beginPath();
                ctx.arc(px, py, 1.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${accent}, ${path.opacity * 2})`;
                ctx.fill();
            });
        });
    }

    function drawRobot() {
        const accent = getAccentColor();
        const pt = getPointOnPath(paths[0].points, robotT);
        const px = pt.x * w;
        const py = pt.y * h;

        // Glow
        const glow = ctx.createRadialGradient(px, py, 0, px, py, 20);
        glow.addColorStop(0, `rgba(${accent}, 0.15)`);
        glow.addColorStop(1, `rgba(${accent}, 0)`);
        ctx.beginPath();
        ctx.arc(px, py, 20, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Robot dot
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accent}, 0.6)`;
        ctx.fill();

        // Center bright dot
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accent}, 0.9)`;
        ctx.fill();

        // Trail — draw a fading trail behind the robot
        const trailLength = 0.08;
        const trailSteps = 20;
        for (let i = 0; i < trailSteps; i++) {
            const trailT = robotT - (trailLength * (i / trailSteps));
            if (trailT < 0) continue;
            const trailPt = getPointOnPath(paths[0].points, trailT);
            const trailPx = trailPt.x * w;
            const trailPy = trailPt.y * h;
            const alpha = 0.15 * (1 - i / trailSteps);
            ctx.beginPath();
            ctx.arc(trailPx, trailPy, 2 * (1 - i / trailSteps), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${accent}, ${alpha})`;
            ctx.fill();
        }
    }

    function animate() {
        ctx.clearRect(0, 0, w, h);

        drawGrid();
        drawPaths();
        drawRobot();

        robotT += robotSpeed;
        if (robotT > 1) robotT = 0;

        animationId = requestAnimationFrame(animate);
    }

    animate();
}

// ---- Subtle Parallax ----
function initParallax() {
    const heroCanvas = document.getElementById('hero-canvas');
    const philosophy = document.getElementById('philosophy');
    let ticking = false;

    function updateParallax() {
        const scrollY = window.scrollY;

        if (heroCanvas) {
            heroCanvas.style.transform = `translateY(${scrollY * 0.3}px)`;
        }

        if (philosophy) {
            const rect = philosophy.getBoundingClientRect();
            const inView = rect.top < window.innerHeight && rect.bottom > 0;
            if (inView) {
                const offset = (rect.top - window.innerHeight) * 0.1;
                philosophy.querySelector('.philosophy-quote').style.transform = `translateY(${offset}px)`;
            }
        }

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }, { passive: true });
}

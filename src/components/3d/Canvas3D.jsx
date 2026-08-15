import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Canvas3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Mouse tracking
    const mouse = { x: 0, y: 0 };
    const handleMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Particles
    const particleCount = 800;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const colorOptions = [
      new THREE.Color(0x00F2FE),
      new THREE.Color(0x4FACFE),
      new THREE.Color(0x7000FF),
      new THREE.Color(0xE040FB),
      new THREE.Color(0x10B981),
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      const c = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = Math.random() * 3 + 1;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Floating 3D Shapes
    const shapes = [];
    const shapeConfigs = [
      { geo: new THREE.IcosahedronGeometry(0.6, 0), color: 0x00F2FE, x: -2.5, y: 1.2, speed: 0.008 },
      { geo: new THREE.OctahedronGeometry(0.5, 0),  color: 0xE040FB, x: 2.8,  y: -0.8, speed: 0.012 },
      { geo: new THREE.TetrahedronGeometry(0.55, 0),color: 0x10B981, x: 0.5,  y: 2.0,  speed: 0.006 },
      { geo: new THREE.IcosahedronGeometry(0.4, 0), color: 0x7000FF, x: -1.0, y: -2.0, speed: 0.01 },
      { geo: new THREE.OctahedronGeometry(0.35, 0), color: 0x4FACFE, x: 3.5,  y: 1.5,  speed: 0.009 },
    ];

    shapeConfigs.forEach(cfg => {
      const mat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      });
      const mesh = new THREE.Mesh(cfg.geo, mat);
      mesh.position.set(cfg.x, cfg.y, -3 + Math.random() * -2);
      mesh.userData = { speed: cfg.speed, floatOffset: Math.random() * Math.PI * 2 };
      scene.add(mesh);
      shapes.push(mesh);
    });

    // Resize handler
    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Rotate particles
      particles.rotation.y = t * 0.03;
      particles.rotation.x = t * 0.01;

      // Camera subtle parallax with mouse
      camera.position.x += (mouse.x * 0.3 - camera.position.x) * 0.04;
      camera.position.y += (mouse.y * 0.2 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      // Float shapes
      shapes.forEach((shape) => {
        shape.rotation.x += shape.userData.speed;
        shape.rotation.y += shape.userData.speed * 1.3;
        shape.position.y += Math.sin(t * 0.6 + shape.userData.floatOffset) * 0.003;
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

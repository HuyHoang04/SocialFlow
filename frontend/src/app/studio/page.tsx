'use client';

import React, { useState, useRef, useEffect, Suspense, useMemo } from 'react';
import AppShell from '@/components/AppShell';
import * as THREE from 'three';
import { Canvas, useThree, useLoader, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text, Html, Box, Sphere, Cylinder, useGLTF, useFBX, Float, Sparkles, MeshReflectorMaterial, Backdrop, Sky, Cloud, useProgress } from '@react-three/drei';
import { IconFilm, IconPlay, IconSettings, IconDownload, IconVolume2, IconVolumeX, IconCamera, IconPlus, IconTrash } from '@/components/Icons';
import { useBrand } from '@/lib/brand-context';
import { api } from '@/lib/api';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

let globalCameraPos: [number, number, number] = [0, 0, 4];
let globalCameraTarget: [number, number, number] = [0, 0, 0];

function LoaderOverlay() {
  const { active, progress, loaded, total } = useProgress();
  if (!active) return null;
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(17, 17, 19, 0.9)', backdropFilter: 'blur(10px)',
      zIndex: 9999, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', color: 'white'
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <IconFilm size={32} color="var(--accent)" />
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Đang chuẩn bị Studio...</h2>
      </div>
      <div style={{ width: 300, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s ease' }} />
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12, fontFamily: 'monospace' }}>
        Tải mô hình 3D: {Math.round(progress)}% ({loaded}/{total})
      </div>
    </div>
  );
}

function MediaOverlay({ url, scale = 1.0, width = 320, height = 180, aspectRatio = '16:9' }: { url: string | null, scale?: number, width?: number, height?: number, aspectRatio?: '16:9' | '9:16' }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => setHasError(false), [url]);

  if (!url) return null;
  const isVideo = url.match(/\.(mp4|webm|mov)$/i) || url.includes('/video/upload/');

  const positionStyles: React.CSSProperties = aspectRatio === '9:16'
    ? { top: 32, left: '50%', transform: 'translateX(-50%)' }
    : { top: 32, right: 32 };

  return (
    <div className="media-overlay-container" style={{
      position: 'absolute',
      ...positionStyles,
      width: `${width * scale}px`,
      height: `${height * scale}px`,
      background: 'rgba(15, 12, 41, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 15px 35px rgba(0,0,0,0.5), 0 0 20px rgba(108, 92, 231, 0.4)',
      border: '1px solid rgba(255,255,255,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column',
      zIndex: 10,
      transition: 'all 0.3s ease'
    }}>
      {hasError ? (
        <div style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'sans-serif', textAlign: 'center', padding: '20px' }}>
          <IconFilm size={32} />
          <div style={{ fontSize: '13px', marginTop: '8px' }}>Không tải được hình ảnh/video</div>
        </div>
      ) : isVideo ? (
        <video className="media-overlay-content" crossOrigin="anonymous" src={`${url}?cors=1`} autoPlay loop muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setHasError(true)} />
      ) : (
        <img className="media-overlay-content" crossOrigin="anonymous" src={`${url}?cors=1`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Context" onError={() => setHasError(true)} />
      )}
    </div>
  );
}

function SceneBackground() {
  const { scene: bgScene } = useGLTF('/minimalistic_modern_office.glb');
  const { scene } = useThree();

  useEffect(() => {
    scene.background = new THREE.Color('#ffffff'); // Nền trắng sáng sủa ngoài cửa sổ
    scene.fog = null; // Tắt sương mù
  }, [scene]);

  return (
    <group>
      {/* Ánh sáng mô phỏng môi trường trong nhà / thành phố */}
      <Environment preset="city" />
      <ambientLight intensity={1.0} color="#ffffff" />

      {/* Đặt trong một group để xoay toàn bộ căn phòng quanh nhân vật */}
      {/* Góc xoay -Math.PI / 3 = -60 độ */}
      <group rotation={[0, -Math.PI / 3, 0]}>
        {/* Thu nhỏ văn phòng về scale 1.0 và hạ xuống để sàn nhà khớp với Y = -0.5 */}
        <primitive object={bgScene} scale={1.0} position={[-6, -3, -1.2]} />
      </group>
    </group>
  );
}

function CameraTracker({ activeScene }: { activeScene: any }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Jump camera when scene changes or preset is clicked
  useEffect(() => {
    if (activeScene) {
      camera.position.set(
        activeScene.cameraPosition[0],
        activeScene.cameraPosition[1],
        activeScene.cameraPosition[2]
      );
      if (controlsRef.current) {
        controlsRef.current.target.set(
          activeScene.cameraTarget[0],
          activeScene.cameraTarget[1],
          activeScene.cameraTarget[2]
        );
        controlsRef.current.update();
      }
    }
  }, [
    activeScene?.id,
    activeScene?.cameraPosition?.join(','),
    activeScene?.cameraTarget?.join(','),
    camera
  ]);

  useFrame(() => {
    if (controlsRef.current && (window as any).avatarPosition) {
      const avatarPos = (window as any).avatarPosition;
      // Lấy offset x của nhân vật so với tâm (0,0,0) - nhân với 1.1 để bù trừ scale của group
      const avatarOffsetX = avatarPos.x * 1.1;

      // Tính toán vị trí mong muốn của camera và target
      const targetCamX = (activeScene?.cameraPosition?.[0] || 0) + avatarOffsetX;
      const targetLookX = (activeScene?.cameraTarget?.[0] || 0) + avatarOffsetX;

      // Pan camera mượt mà theo nhân vật
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 0.08);
      controlsRef.current.target.x = THREE.MathUtils.lerp(controlsRef.current.target.x, targetLookX, 0.08);
      controlsRef.current.update();
    }

    let currentOffsetX = 0;
    if ((window as any).avatarPosition) {
      currentOffsetX = (window as any).avatarPosition.x * 1.1;
    }

    globalCameraPos = [camera.position.x - currentOffsetX, camera.position.y, camera.position.z];
    if (controlsRef.current) {
      const t = controlsRef.current.target;
      globalCameraTarget = [t.x - currentOffsetX, t.y, t.z];
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minPolarAngle={Math.PI / 3}
      maxPolarAngle={Math.PI / 1.8}
      minDistance={1.5}
      maxDistance={8}
    />
  );
}

class AvatarErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '16px', borderRadius: '8px', color: '#ef4444', textAlign: 'center', minWidth: '250px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Failed to load avatar</h3>
            <p style={{ fontSize: '12px', margin: 0, opacity: 0.8 }}>{this.state.error?.message}</p>
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}

function DebouncedTextarea({ value, onChange, style }: { value: string, onChange: (val: string) => void, style?: React.CSSProperties }) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [localValue, value, onChange]);

  return (
    <textarea
      value={localValue}
      onChange={e => setLocalValue(e.target.value)}
      style={style}
    />
  );
}

function CustomAvatar({ url, speaking, gesture, isMoving, aspectRatio }: { url: string, speaking: boolean, gesture: string, isMoving?: boolean, aspectRatio?: '16:9' | '9:16' }) {
  const { scene: originalScene } = useGLTF(url);

  const clonedScene = useMemo(() => {
    return SkeletonUtils.clone(originalScene);
  }, [originalScene]);

  const speakingRef = useRef(speaking);
  const gestureRef = useRef(gesture);
  const isMovingRef = useRef(isMoving);
  speakingRef.current = speaking;
  gestureRef.current = gesture;
  isMovingRef.current = isMoving;

  const startTimeRef = useRef(Date.now());
  const blinkRef = useRef({ nextTime: 3, phase: 0 });
  const walkInterpolation = useRef(0);

  // Store original bone rotations once
  const origQuats = useRef<Record<string, THREE.Quaternion>>({});
  const targetOffsets = useRef<Record<string, { x: number, y: number, z: number }>>({});
  const currentOffsets = useRef<Record<string, { x: number, y: number, z: number }>>({});
  const nextBlinkTime = useRef<number>(2);
  const nextEyeDartTime = useRef<number>(1);
  const eyeDartTarget = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const debugDone = useRef(false);
  const headMeshRef = useRef<any>(null);
  const teethMeshRef = useRef<any>(null);
  useEffect(() => {
    const bonesToSave = ['Head', 'Neck', 'Spine', 'Spine1', 'Spine2', 'Hips',
      'RightShoulder', 'LeftShoulder', 'RightArm', 'LeftArm', 'RightForeArm', 'LeftForeArm',
      'RightHand', 'LeftHand', 'RightUpLeg', 'LeftUpLeg', 'RightLeg', 'LeftLeg', 'RightEye', 'LeftEye'];
    ['Right', 'Left'].forEach((side) => {
      ['Index', 'Middle', 'Ring', 'Pinky'].forEach(finger => {
        [1, 2, 3].forEach(joint => {
          bonesToSave.push(`${side}Hand${finger}${joint}`);
        });
      });
      [1, 2, 3].forEach(joint => {
        bonesToSave.push(`${side}HandThumb${joint}`);
      });
    });

    if (clonedScene) {
      bonesToSave.forEach(stdName => {
        let bone: any = null;
        clonedScene.traverse((node: any) => {
          if (bone) return;
          if (node.isBone) {
            if (node.name === stdName ||
              node.name === 'mixamorig' + stdName ||
              node.name.startsWith(stdName + '_')) {
              bone = node;
            }
          }
        });

        if (bone) {
          if (!origQuats.current[stdName]) {
            origQuats.current[stdName] = bone.quaternion.clone();
          }
          if (!currentOffsets.current[stdName]) {
            currentOffsets.current[stdName] = { x: 0, y: 0, z: 0 };
          }
          targetOffsets.current[stdName] = { x: 0, y: 0, z: 0 };
          // Gắn thêm userData để lookup nhanh trong useFrame
          bone.userData.stdName = stdName;
        }
      });
    }

    // Log arm bone original rotations to find correct axis
    console.log('[ARMS DEBUG] RightArm orig:', origQuats.current['RightArm']?.toArray());
    console.log('[ARMS DEBUG] LeftArm orig:', origQuats.current['LeftArm']?.toArray());
    console.log('[ARMS DEBUG] RightForeArm orig:', origQuats.current['RightForeArm']?.toArray());
  }, [clonedScene]);

  // Use R3F's useFrame for synchronized animation
  useFrame((state, rawDelta) => {
    // Giới hạn delta tối đa là 0.1s. 
    // Khi user chuyển tab, browser sẽ dừng render. Khi quay lại, rawDelta có thể lên tới hàng chục giây.
    // Nếu không giới hạn, các hàm Lerp sẽ bị nhân với hệ số khổng lồ (alpha > 1), khiến cơ mặt/xương văng đi rất xa rồi mới từ từ kéo về.
    const delta = Math.min(rawDelta, 0.1);

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const isSpeaking = speakingRef.current;
    const isMovingState = isMovingRef.current;

    let currentGesture = gestureRef.current;
    if (currentGesture === 'auto') {
      // Khi đang chế độ Auto, nếu ngưng nói thì tự động chuyển về dáng Natural để không bị "đứng chào hoài"
      currentGesture = isSpeaking ? ((window as any).currentAutoGesture || 'natural') : 'natural';
    }

    const getBone = (stdName: string) => {
      let found: any = null;
      clonedScene.traverse((node: any) => {
        if (found) return;
        if (node.isBone && node.userData.stdName === stdName) {
          found = node;
        }
      });
      return found;
    };
    const getTarget = (name: string) => targetOffsets.current[name];

    // Reset target rotations to original poses at start of frame
    for (const name of Object.keys(targetOffsets.current)) {
      targetOffsets.current[name] = { x: 0, y: 0, z: 0 };
    }

    // Utility for natural, non-repeating movement
    const getNoise = (t: number, speed: number, amp: number) => {
      return (
        Math.sin(t * speed) * 0.5 +
        Math.sin(t * speed * 1.37 + 1.2) * 0.3 +
        Math.sin(t * speed * 2.14 + 0.5) * 0.2
      ) * amp;
    };

    // ─── BREATHING & POSTURE (visible chest & micro movements) ───
    const breathDelta = Math.sin(elapsed * 1.8) * 0.03;
    const postureShiftZ = Math.sin(elapsed * 0.4) * 0.02; // Lắc nhẹ sang 2 bên rất chậm
    const postureShiftY = Math.sin(elapsed * 0.25) * 0.015; // Vặn mình cực nhẹ

    const spine = getTarget('Spine');
    const spine1 = getTarget('Spine1');
    const spine2 = getTarget('Spine2');
    if (spine) { spine.x += breathDelta; spine.z += postureShiftZ; }
    if (spine1) { spine1.x += breathDelta * 0.7; spine1.y += postureShiftY; }
    if (spine2) { spine2.x += breathDelta * 0.5; spine2.z -= postureShiftZ * 0.5; }

    // ─── WEIGHT SHIFT & LEGS ───
    const hips = getTarget('Hips');
    const rUpLeg = getTarget('RightUpLeg');
    const lUpLeg = getTarget('LeftUpLeg');
    if (hips) {
      hips.z += Math.sin(elapsed * 0.5) * 0.02; // Đảo hông nhẹ
      hips.x += Math.sin(elapsed * 0.2) * 0.01;
    }
    if (rUpLeg) {
      // Khép đùi vào trong nhiều hơn (z += 0.09) và hơi xoay mũi chân cho thẳng (y += 0.02)
      rUpLeg.z += 0.09 - Math.sin(elapsed * 0.5) * 0.02;
      rUpLeg.y += 0.02;
    }
    if (lUpLeg) {
      lUpLeg.z += -0.09 - Math.sin(elapsed * 0.5) * 0.02;
      lUpLeg.y -= 0.02;
    }

    // ─── EYE DARTING (Ánh mắt có hồn) ───
    if (elapsed > nextEyeDartTime.current) {
      // Đảo mắt nhìn tự nhiên thẳng vào camera, không cúi xuống hay ngước lên quá đà
      eyeDartTarget.current = {
        x: (Math.random() - 0.5) * 0.05,
        y: (Math.random() - 0.5) * 0.1
      };
      nextEyeDartTime.current = elapsed + 1 + Math.random() * 3;
    }
    const rEye = getTarget('RightEye');
    const lEye = getTarget('LeftEye');
    if (rEye) { rEye.x += eyeDartTarget.current.x; rEye.y += eyeDartTarget.current.y; }
    if (lEye) { lEye.x += eyeDartTarget.current.x; lEye.y += eyeDartTarget.current.y; }

    // ─── ARM POSE: bring from T-pose to natural (ASYMMETRICAL) ───
    const rArm = getTarget('RightArm');
    const lArm = getTarget('LeftArm');
    const rForeArm = getTarget('RightForeArm');
    const lForeArm = getTarget('LeftForeArm');

    // Vai phải hơi xệ xuống, tay hơi khép vào người hơn
    if (rArm) {
      rArm.y += 0.05;
      rArm.x += 0.25;
      rArm.z -= 0.05;
    }
    if (lArm) {
      lArm.y -= 0;
      lArm.x += 0.2;
      lArm.z += 0;
    }
    // Cẳng tay phải hơi xoay nhẹ
    if (rForeArm) {
      rForeArm.x += 0.15;
      rForeArm.y += 0.1;
      rForeArm.z -= 0.05;
    }
    if (lForeArm) {
      lForeArm.x += 0.2;
      lForeArm.y -= 0;
      lForeArm.z += 0;
    }

    // ─── MICRO-MOVEMENTS (Fingers) ───
    // Dùng sóng tay để biết khi nào tay đang giơ lên. Tay giơ lên thì xòe ngón ra, tay hạ xuống thì khép nhẹ lại.
    const rWaveFingers = Math.sin(elapsed * 0.4 + 0.4);
    const lWaveFingers = Math.sin(elapsed * 0.35 + 1.4);
    const rOpen = Math.max(0, rWaveFingers);
    const lOpen = Math.max(0, lWaveFingers);

    ['Right', 'Left'].forEach((side) => {
      const handOpen = side === 'Right' ? rOpen : lOpen;

      // Độ lệch để khép các ngón tay sát vào nhau (tránh bị xòe như chân vịt)
      const spreadOffsets = {
        'Index': -0.04,
        'Middle': 0,
        'Ring': 0.04,
        'Pinky': 0.08
      };

      ['Index', 'Middle', 'Ring', 'Pinky'].forEach((finger, i) => {
        [1, 2, 3].forEach(joint => {
          const b = getTarget(`${side}Hand${finger}${joint}`);
          if (b) {
            // Trục X điều khiển độ gập ngón tay. Gập nhiều hơn khi tay xuôi (0.5), mở ra khi giơ lên (0.1)
            b.x += 0.5 - handOpen * 0.4 + Math.sin(elapsed * 2.5 + i) * 0.05; // Cử động ngón rõ và nhanh hơn

            // Trục Z (hoặc Y) để khép/mở sải ngón tay. Chỉ áp dụng ở khớp đầu tiên.
            if (joint === 1) {
              const spread = spreadOffsets[finger as keyof typeof spreadOffsets];
              const sideMult = side === 'Right' ? 1 : -1;
              // Khép ngón lại khi xuôi tay, hơi xòe ra khi giơ tay
              b.z += spread * sideMult * (1 - handOpen * 0.7);
            }
          }
        });
      });

      const thumb1 = getTarget(`${side}HandThumb1`);
      const thumb2 = getTarget(`${side}HandThumb2`);
      if (thumb1) {
        // Cụp ngón cái sát vào bàn tay hơn
        thumb1.y += (side === 'Right' ? 0.2 : -0.2) * (1 - handOpen) + Math.sin(elapsed * 1.5) * 0.04;
        thumb1.x += 0.15;
      }
      if (thumb2) {
        thumb2.x += 0.1; // Gập nhẹ đốt 2 ngón cái
      }
    });

    // ─── HEAD & NECK (Always subtle movement, look at user) ───
    const head = getTarget('Head');
    const neck = getTarget('Neck');

    // Ngoái cổ nhìn vào camera (bù lại góc nghiêng cơ thể)
    let headLookAngle = 0;
    if (walkInterpolation.current > 0.01) {
      headLookAngle = -clonedScene.rotation.y * 0.6; // Bù 60% góc quay cơ thể để mặt hướng gần camera
    }

    // Nhịp gật gù tự nhiên (Ngửa lên / Cụp xuống chậm rãi nhiều tần số kết hợp)
    const slowNod = Math.sin(elapsed * 0.6) * 0.06 + Math.sin(elapsed * 0.3) * 0.04;

    if (neck) {
      // Giảm biên độ gập cổ xuống 0.05
      neck.x += 0.05 + getNoise(elapsed, 1.2, 0.03) + slowNod * 0.4;
      neck.y += getNoise(elapsed, 0.8, 0.02) + headLookAngle * 0.4;
    }
    if (head) {
      // Giảm biên độ gập mặt xuống 0.08
      head.x += 0.08 + getNoise(elapsed, 1.5, 0.04) + slowNod * 0.6;
      head.y += getNoise(elapsed, 0.7, 0.06) + headLookAngle * 0.6;
      head.z += getNoise(elapsed, 0.9, 0.04);
    }

    // ─── MORPH TARGETS (Lip Sync & Expressions) ───
    if (!(window as any).lipSyncTargets) {
      (window as any).lipSyncTargets = { mouthOpen: 0, mouthSmile: 0, mouthPucker: 0, timer: 0, maxTimer: 0.25 };
    }
    const lips = (window as any).lipSyncTargets;

    // Tìm mesh khuôn mặt để gắn biểu cảm
    if (!headMeshRef.current) {
      clonedScene.traverse((node: any) => {
        if (node.isMesh && node.morphTargetDictionary) {
          if (node.name.includes('Wolf3D_Head') || node.name.includes('Wolf3D_Avatar') || node.name === 'Face' || node.name.includes('Streamoji_Head')) {
            headMeshRef.current = node;
          }
          if (node.name.includes('Wolf3D_Teeth') || node.name === 'Teeth' || node.name.includes('Streamoji_Teeth')) {
            teethMeshRef.current = node;
          }
        }
      });
    }

    // Tạo nhịp điệu đóng/mở mượt mà cho mỗi từ (dùng hàm sine từ 0 -> 1 -> 0)
    if (lips.timer > 0) {
      lips.timer = Math.max(0, lips.timer - delta);
    }
    // Nếu timer = maxTimer -> sin(pi) = 0. Nếu timer = maxTimer/2 -> sin(pi/2) = 1.
    // Điều này giúp miệng mở ra rồi ĐÓNG LẠI rõ ràng sau mỗi chữ, hết bị "mấp máy"
    const pulse = lips.maxTimer > 0 ? Math.sin((lips.timer / lips.maxTimer) * Math.PI) : 0;

    const targetOpen = lips.mouthOpen * pulse;
    const targetSmile = lips.mouthSmile * pulse;
    const targetPucker = lips.mouthPucker * pulse;

    clonedScene.traverse((node: any) => {
      if (node.isMesh && node.morphTargetDictionary) {
        const d = node.morphTargetDictionary;
        const inf = node.morphTargetInfluences;

        // Blinking logic
        let blinkValue = 0;
        if (elapsed > nextBlinkTime.current) {
          const blinkDuration = elapsed - nextBlinkTime.current;
          if (blinkDuration < 0.15) {
            // Nhắm mắt nhanh
            blinkValue = Math.sin((blinkDuration / 0.15) * Math.PI);
          } else {
            // Reset timer
            nextBlinkTime.current = elapsed + 2 + Math.random() * 4;
          }
        }

        if (d['eyeBlinkLeft'] !== undefined) inf[d['eyeBlinkLeft']] = blinkValue;
        if (d['eyeBlinkRight'] !== undefined) inf[d['eyeBlinkRight']] = blinkValue;

        // Eyebrows, Squinting & Eyes Widening
        let browValue = 0;
        let squintValue = Math.max(0, getNoise(elapsed, 1.5, 0.2)); // Nheo mắt tự nhiên hơn

        if (isSpeaking) {
          // Nhướng mày mạnh hơn nhiều theo nhịp nói
          const baseBrow = Math.max(0, getNoise(elapsed, 3.5, 1.0)); // Tăng noise base lên 1.0
          browValue = (currentGesture === 'expressive' || currentGesture === 'energetic') ? baseBrow * 2.0 : baseBrow * 1.2;
          squintValue = Math.max(0, getNoise(elapsed, 4.0, 0.4));
        }

        if (d['browInnerUp'] !== undefined) {
          inf[d['browInnerUp']] = THREE.MathUtils.lerp(inf[d['browInnerUp']] || 0, Math.min(1, browValue), 15 * delta);
        }
        if (d['browOuterUpLeft'] !== undefined) {
          inf[d['browOuterUpLeft']] = THREE.MathUtils.lerp(inf[d['browOuterUpLeft']] || 0, Math.min(1, browValue), 15 * delta);
        }
        if (d['browOuterUpRight'] !== undefined) {
          inf[d['browOuterUpRight']] = THREE.MathUtils.lerp(inf[d['browOuterUpRight']] || 0, Math.min(1, browValue), 15 * delta);
        }

        // Mắt mở to khi nhướng mày (trợn mắt lên cho có cảm xúc)
        if (d['eyeWideLeft'] !== undefined) {
          inf[d['eyeWideLeft']] = THREE.MathUtils.lerp(inf[d['eyeWideLeft']] || 0, Math.min(1, browValue * 0.8), 15 * delta);
        }
        if (d['eyeWideRight'] !== undefined) {
          inf[d['eyeWideRight']] = THREE.MathUtils.lerp(inf[d['eyeWideRight']] || 0, Math.min(1, browValue * 0.8), 15 * delta);
        }

        if (d['eyeSquintLeft'] !== undefined) {
          inf[d['eyeSquintLeft']] = THREE.MathUtils.lerp(inf[d['eyeSquintLeft']] || 0, squintValue, 15 * delta);
        }
        if (d['eyeSquintRight'] !== undefined) {
          inf[d['eyeSquintRight']] = THREE.MathUtils.lerp(inf[d['eyeSquintRight']] || 0, squintValue, 15 * delta);
        }

        // Mouth Expressions & Associated Facial Muscles
        if (isSpeaking) {
          // 1. Há miệng (Open) - Trả về biên độ chuẩn 1.0 vì model này biểu cảm mạnh sẵn
          if (d['mouthOpen'] !== undefined) {
            inf[d['mouthOpen']] = THREE.MathUtils.lerp(inf[d['mouthOpen']] || 0, Math.min(1, targetOpen * 1.0), 25 * delta);
          }
          if (d['jawOpen'] !== undefined) {
            inf[d['jawOpen']] = THREE.MathUtils.lerp(inf[d['jawOpen']] || 0, Math.min(1, targetOpen * 1.0), 25 * delta);
          }
          if (d['jawForward'] !== undefined) {
            inf[d['jawForward']] = THREE.MathUtils.lerp(inf[d['jawForward']] || 0, Math.min(1, targetOpen * 0.5), 25 * delta);
          }

          // 2. Chu mỏ (Pucker) - Tăng biên độ
          if (d['mouthPucker'] !== undefined) {
            inf[d['mouthPucker']] = THREE.MathUtils.lerp(inf[d['mouthPucker']] || 0, Math.min(1, targetPucker * 1.5), 20 * delta);
          }
          if (d['mouthPressLeft'] !== undefined) {
            inf[d['mouthPressLeft']] = THREE.MathUtils.lerp(inf[d['mouthPressLeft']] || 0, Math.min(1, targetPucker * 0.8), 20 * delta); // Ép môi khi chu
          }
          if (d['mouthPressRight'] !== undefined) {
            inf[d['mouthPressRight']] = THREE.MathUtils.lerp(inf[d['mouthPressRight']] || 0, Math.min(1, targetPucker * 0.8), 20 * delta);
          }

          // 3. Nhe răng/Cười (Smile/Stretch)
          const combinedSmile = Math.min(1, Math.max(0, Math.sin(elapsed * 3)) * 0.3 + targetSmile * 1.5);
          if (d['mouthSmile'] !== undefined) {
            inf[d['mouthSmile']] = THREE.MathUtils.lerp(inf[d['mouthSmile']] || 0, combinedSmile, 20 * delta);
          }
          if (d['mouthStretchLeft'] !== undefined) {
            inf[d['mouthStretchLeft']] = THREE.MathUtils.lerp(inf[d['mouthStretchLeft']] || 0, targetSmile * 0.8, 20 * delta); // Kéo khóe miệng
          }
          if (d['mouthStretchRight'] !== undefined) {
            inf[d['mouthStretchRight']] = THREE.MathUtils.lerp(inf[d['mouthStretchRight']] || 0, targetSmile * 0.8, 20 * delta);
          }

          // 4. Nhô má và nhăn mũi tự nhiên theo khẩu hình miệng
          const cheekVal = targetSmile * 0.6 + targetOpen * 0.2;
          if (d['cheekSquintLeft'] !== undefined) {
            inf[d['cheekSquintLeft']] = THREE.MathUtils.lerp(inf[d['cheekSquintLeft']] || 0, Math.min(1, cheekVal), 15 * delta);
          }
          if (d['cheekSquintRight'] !== undefined) {
            inf[d['cheekSquintRight']] = THREE.MathUtils.lerp(inf[d['cheekSquintRight']] || 0, Math.min(1, cheekVal), 15 * delta);
          }
          if (d['noseSneerLeft'] !== undefined) {
            // Chỉ nhăn mũi nhẹ khi nhe răng/cười lớn
            inf[d['noseSneerLeft']] = THREE.MathUtils.lerp(inf[d['noseSneerLeft']] || 0, targetSmile * 0.3, 15 * delta);
          }
          if (d['noseSneerRight'] !== undefined) {
            inf[d['noseSneerRight']] = THREE.MathUtils.lerp(inf[d['noseSneerRight']] || 0, targetSmile * 0.3, 15 * delta);
          }

          if (d['mouthDimpleLeft'] !== undefined) inf[d['mouthDimpleLeft']] = THREE.MathUtils.lerp(inf[d['mouthDimpleLeft']] || 0, 0, 10 * delta);
        } else {
          // Khép miệng mượt mà khi ngừng nói
          if (d['mouthOpen'] !== undefined) inf[d['mouthOpen']] = THREE.MathUtils.lerp(inf[d['mouthOpen']] || 0, 0, 10 * delta);
          if (d['jawOpen'] !== undefined) inf[d['jawOpen']] = THREE.MathUtils.lerp(inf[d['jawOpen']] || 0, 0, 10 * delta);
          if (d['mouthPucker'] !== undefined) inf[d['mouthPucker']] = THREE.MathUtils.lerp(inf[d['mouthPucker']] || 0, 0, 10 * delta);

          const ambientSmile = 0.15 + Math.sin(elapsed * 0.5) * 0.05;
          if (d['mouthSmile'] !== undefined) inf[d['mouthSmile']] = THREE.MathUtils.lerp(inf[d['mouthSmile']] || 0, ambientSmile, 5 * delta);
          if (d['mouthDimpleLeft'] !== undefined) inf[d['mouthDimpleLeft']] = THREE.MathUtils.lerp(inf[d['mouthDimpleLeft']] || 0, ambientSmile * 1.5, 5 * delta);
          if (d['mouthPressLeft'] !== undefined) inf[d['mouthPressLeft']] = 0.05;
        }
      }
    });

    // ─── SPEAKING: head, body, and ARM gestures ───
    const isExpressive = currentGesture === 'expressive' || currentGesture === 'energetic';
    const isEnergetic = currentGesture === 'energetic';
    const isCalm = currentGesture === 'calm';
    const scale = isEnergetic ? 3 : (isExpressive ? 2 : (isCalm ? 0.5 : 1));

    if (isSpeaking) {
      // Đầu gật gù mạnh hơn theo nhịp điệu giọng nói
      if (head) {
        head.x += getNoise(elapsed, 4.0, 0.03 * scale); // Gật đầu mạnh hơn khi nhấn mạnh
        head.y += getNoise(elapsed, 2.5, 0.04 * scale); // Lắc qua lại theo câu chữ
        head.z += getNoise(elapsed, 3.0, 0.02 * scale);
      }
      if (neck) {
        neck.x += getNoise(elapsed, 3.5, 0.02 * scale);
        neck.y += getNoise(elapsed, 2.0, 0.02 * scale);
      }
      if (spine) {
        // Giảm việc vặn mình (spine.y) và ngả nghiêng (spine.z) để người luôn hướng thẳng tới user
        spine.y += Math.sin(elapsed * 1.2) * 0.015 * scale;
        spine.z += Math.sin(elapsed * 0.9) * 0.01 * scale;
        spine.x += Math.sin(elapsed * 1.8) * 0.015 * scale; // Hơi rướn người nhẹ khi nói
      }
      const spine1 = getTarget('Spine1');
      if (spine1) {
        spine1.y += Math.sin(elapsed * 1.5) * 0.01 * scale;
      }
      if (hips) {
        hips.y += Math.sin(elapsed * 0.8) * 0.01 * scale;
      }
    } // Đóng block isSpeaking tại đây để các cử chỉ (Thinking, Shrugging...) luôn hoạt động dù có đang nói hay không!


    // ARM & LEG GESTURES (Luôn áp dụng theo currentGesture)
    const lLeg = getTarget('LeftLeg');
    const rLeg = getTarget('RightLeg');

    // Smooth transition factor
    walkInterpolation.current = THREE.MathUtils.lerp(walkInterpolation.current, isMovingState ? 1 : 0, 0.05);

    const isActuallyWalking = walkInterpolation.current > 0.01;

    if (isActuallyWalking) {
      // 1. Máy trạng thái chu kỳ (State Machine thiết kế theo Giây để kiểm soát chính xác)
      const isVertical = aspectRatio === '9:16';

      const t_walk = isVertical ? 5.0 : 12.0; // Thời gian đi thẳng
      const t_stop = 0.5; // Đứng lại trước khi xoay
      const t_turn = 1.0; // Tăng tốc độ xoay người (trước kia xoay mất tới 4s, giờ chỉ mất 1s)
      const t_lean = 0.5; // Lấy đà

      const cycleDuration = t_walk + t_stop + t_turn + t_lean;
      const phase = (elapsed % (cycleDuration * 2)) / cycleDuration; // Trải từ 0 đến 2

      // Các mốc chuyển pha tương đối
      const p_walk = t_walk / cycleDuration;
      const p_stop = p_walk + (t_stop / cycleDuration);
      const p_turn = p_stop + (t_turn / cycleDuration);

      let targetX = 0;
      let targetAngle = 0;
      let pivotPhase = 0; // 0: Đang đi, 1: Dừng & Chân trụ, 2: Xoay người, 3: Nhún đà
      let angularVel = 0;
      let walkProgress = 0; // Tích lũy quãng đường để đồng bộ hoàn hảo bước chân

      const maxWalkX = isVertical ? 0.6 : 1.5; // Giảm lại vì phòng thu nhỏ, nếu đi xa quá sẽ ra khỏi phòng
      const walkAngle = Math.PI / 3.5;

      // Tuyến tính pha trộn ease: Giữ tốc độ đi bộ đều đặn (không bị lao vút lên quá nhanh ở giữa sân khấu)
      const walkEase = (t: number) => t * 0.7 + (t * t * (3 - 2 * t)) * 0.3;
      const turnEase = (t: number) => t * t * (3 - 2 * t);

      if (phase < p_walk) {
        // Trạng thái 0: Đi thẳng (từ Trái sang Phải)
        const t = phase / p_walk;
        targetX = -maxWalkX + walkEase(t) * (2 * maxWalkX);
        targetAngle = walkAngle;
        walkProgress = walkEase(t) * (2 * maxWalkX);
        pivotPhase = 0;
      } else if (phase < p_stop) {
        // Trạng thái 1: Dừng lại (hai chân trụ, không xoay)
        targetX = maxWalkX;
        targetAngle = walkAngle;
        walkProgress = 2 * maxWalkX;
        pivotPhase = 1;
      } else if (phase < p_turn) {
        // Trạng thái 2: Trụ chân xoay người
        const t = (phase - p_stop) / (p_turn - p_stop);
        targetX = maxWalkX;
        targetAngle = walkAngle - turnEase(t) * (2 * walkAngle);
        angularVel = -Math.sin(t * Math.PI); // Âm vì quay trái
        walkProgress = 2 * maxWalkX;
        pivotPhase = 2;
      } else if (phase < 1.0) {
        // Trạng thái 3: Lấy đà
        targetX = maxWalkX;
        targetAngle = -walkAngle;
        walkProgress = 2 * maxWalkX;
        pivotPhase = 3;
      } else if (phase < 1.0 + p_walk) {
        // Trạng thái 0: Đi thẳng (từ Phải sang Trái)
        const t = (phase - 1.0) / p_walk;
        targetX = maxWalkX - walkEase(t) * (2 * maxWalkX);
        targetAngle = -walkAngle;
        walkProgress = 2 * maxWalkX + walkEase(t) * (2 * maxWalkX);
        pivotPhase = 0;
      } else if (phase < 1.0 + p_stop) {
        // Trạng thái 1: Dừng lại
        targetX = -maxWalkX;
        targetAngle = -walkAngle;
        walkProgress = 4 * maxWalkX;
        pivotPhase = 1;
      } else if (phase < 1.0 + p_turn) {
        // Trạng thái 2: Trụ chân xoay người
        const t = (phase - (1.0 + p_stop)) / (p_turn - p_stop);
        targetX = -maxWalkX;
        targetAngle = -walkAngle + turnEase(t) * (2 * walkAngle);
        angularVel = Math.sin(t * Math.PI); // Dương vì quay phải
        walkProgress = 4 * maxWalkX;
        pivotPhase = 2;
      } else {
        // Trạng thái 3: Lấy đà
        targetX = -maxWalkX;
        targetAngle = walkAngle;
        walkProgress = 4 * maxWalkX;
        pivotPhase = 3;
      }

      const newX = targetX * walkInterpolation.current;
      const newZ = 0;

      // 2. Nhịp bước chân (Đồng bộ tuyệt đối với quãng đường)
      const stepsPerLength = isVertical ? 5 : 14;
      const baseCycle = (walkProgress / (2 * maxWalkX)) * (stepsPerLength * Math.PI);
      const walkCycle = baseCycle - Math.sin(baseCycle * 2) * 0.25;

      // 3. Cơ chế xoay thân trên trước (Anticipation Cascade)
      const turnSway = angularVel * 0.05;

      const calcLeadAngle = (startPhase: number, p: number) => {
        if (p < startPhase) return walkAngle;
        if (p >= startPhase && p < p_turn) {
          const t = Math.max(0, Math.min(1, (p - startPhase) / (p_turn - startPhase)));
          return walkAngle - turnEase(t) * (2 * walkAngle);
        }
        if (p >= p_turn && p < 1.0) return -walkAngle;

        const startPhase2 = startPhase + 1.0;
        const p_turn2 = p_turn + 1.0;

        if (p < startPhase2) return -walkAngle;
        if (p >= startPhase2 && p < p_turn2) {
          const t = Math.max(0, Math.min(1, (p - startPhase2) / (p_turn2 - startPhase2)));
          return -walkAngle + turnEase(t) * (2 * walkAngle);
        }
        return walkAngle;
      };

      // Tự động tính toán các mốc bắt đầu xoay (Anticipation) so với thời điểm xoay chân (p_stop)
      const t_head = p_stop - 0.06;
      const t_chest = p_stop - 0.04;
      const t_spine = p_stop - 0.02;

      const targetAngleHead = calcLeadAngle(t_head, phase);
      const targetAngleChest = calcLeadAngle(t_chest, phase);
      const targetAngleSpine = calcLeadAngle(t_spine, phase);

      // Góc lệch tuyệt đối so với hông/chân (targetAngle)
      const leadHead = targetAngleHead - targetAngle;
      const leadChest = targetAngleChest - targetAngle;
      const leadSpine = targetAngleSpine - targetAngle;

      const leadTwistArm = leadChest;

      const hips = getTarget('Hips');
      const spine = getTarget('Spine');
      const spine1 = getTarget('Spine1');
      const head = getTarget('Head');

      // Tính toán đà rướn người, độ bành mũi chân và thả lỏng tay
      let forwardLean = 0;
      let footVshape = 0;
      let armRelax = 0;

      const calcLean = (p: number) => {
        if (p < p_walk) return 0.02;
        if (p < p_stop) return 0.02 - ((p - p_walk) / (p_stop - p_walk)) * 0.03;
        if (p < p_turn) return -0.01;
        if (p < 1.0) return -0.01 + ((p - p_turn) / (1.0 - p_turn)) * 0.03;
        return 0;
      };

      const calcVshape = (p: number) => {
        const p_v_start = p_walk - 0.05; // Mở chân trước khi dừng 1 chút
        if (p > p_v_start && p < p_walk) return (p - p_v_start) / 0.05;
        if (p >= p_walk && p < p_turn + 0.05) return 1;
        if (p >= p_turn + 0.05 && p < 1.0) return Math.max(0, 1 - (p - (p_turn + 0.05)) / 0.05);
        return 0;
      };

      if (phase < 1.0) {
        forwardLean = calcLean(phase);
        footVshape = calcVshape(phase);
      } else {
        forwardLean = calcLean(phase - 1.0);
        footVshape = calcVshape(phase - 1.0);
      }
      armRelax = footVshape;
      // ---- GLOBAL POSTURE CORRECTION (SỬA DÁNG MẶC ĐỊNH) ----
      // Khắc phục lỗi dáng đứng của model 3D gốc bị ưỡn ngực và ngửa ra sau quá nhiều.
      // TRỤC X DƯƠNG (+) làm gập người về phía trước đối với các xương cột sống.
      if (spine) spine.x += 0.04;   // Lưng dưới thu về trước nhẹ
      if (spine1) spine1.x += 0.08; // Lồng ngực (Ngực) thu về trước nhiều hơn để hết bị "ưỡn ngực"

      // Truyền góc lệch theo chuỗi động học (Kinematic Chain)
      if (hips) {
        // Trục X âm làm khung chậu chúi về trước (vểnh mông ra sau), đổ trọng tâm để bước đi
        hips.x -= (forwardLean + 0.08) * walkInterpolation.current;
      }
      if (spine) {
        // Trục X dương bẻ ngược cột sống ra sau để bù đắp, giữ lồng ngực thẳng đứng (tạo hình chữ S ở thắt lưng)
        spine.x += 0.08 * walkInterpolation.current;
        spine.y += leadSpine * walkInterpolation.current; // Bụng xoay so với Hông
      }
      if (spine1) {
        // Không cộng dồn forwardLean ở đây để tránh gập lưng
        spine1.y += (leadChest - leadSpine) * walkInterpolation.current; // Ngực xoay so với Bụng
        spine1.z += turnSway * walkInterpolation.current;
      }
      if (head) {
        head.y += (leadHead - leadChest) * walkInterpolation.current; // Đầu xoay so với Ngực
        head.z += turnSway * 0.2 * walkInterpolation.current;
      }

      // Chuyển động Contra-body (Xoắn người)
      const torsoTwist = Math.sin(walkCycle) * 0.05 * walkInterpolation.current; // Giảm độ vặn để bớt lỏng lẻo
      if (spine1) spine1.y += torsoTwist; // Lồng ngực vặn theo tay
      if (hips) hips.y -= torsoTwist * 0.5; // Hông vặn ngược lại theo chân
      if (head) head.y -= torsoTwist; // Đầu xoay ngược chiều ngực để giữ ánh mắt thẳng vào camera

      const headNod = Math.sin(walkCycle * 2) * 0.01 * walkInterpolation.current;
      if (head) head.x -= headNod;

      // Động lực học của Hông (Hip Mechanics & Root Translation)
      const actualHips = getBone('Hips');
      if (actualHips) {
        if (!(window as any).origHipsY) {
          (window as any).origHipsY = actualHips.position.y;
          (window as any).origHipsX = actualHips.position.x;
        }

        // 1. Hạ hông (Hip Drop): Hông hạ thấp khi sải bước dài (sin = 1) và nâng lên khi hai chân chụm lại (sin = 0)
        // Điều này giữ bàn chân dính trên mặt đất thay vì nhấc bổng cả cơ thể lên. Giảm biên độ xuống 0.015 để không bị nhún quá.
        const hipDrop = Math.abs(Math.sin(walkCycle)) * 0.015 * walkInterpolation.current;
        actualHips.position.y = (window as any).origHipsY - hipDrop;

        // 2. Lắc hông ngang (Lateral Weight Shift): Dồn trọng lượng sang chân trụ
        const hipShift = Math.sin(walkCycle) * 0.03 * walkInterpolation.current;
        actualHips.position.x = (window as any).origHipsX + hipShift;

        // 3. Nghiêng khung chậu (Pelvic Tilt): Hông nghiêng nhẹ theo nhịp chân
        if (hips) {
          hips.z += Math.sin(walkCycle) * 0.03 * walkInterpolation.current;
        }
      }

      // Đặt scene cố định trên mặt đất, không nảy lên nảy xuống ảo nữa
      clonedScene.position.set(newX, -2.5, newZ);

      if (walkInterpolation.current > 0.1) {
        clonedScene.rotation.set(0, targetAngle, 0);
      } else {
        clonedScene.rotation.set(0, 0, 0);
      }

      // Đánh tay (ngược pha với chân)
      if (lArm) lArm.x += Math.sin(walkCycle) * 0.12 * walkInterpolation.current;
      if (rArm) rArm.x -= Math.sin(walkCycle) * 0.12 * walkInterpolation.current;

      // Cánh tay và vai vung đi trước thân trên khi cua
      if (lArm) lArm.x += leadTwistArm * 0.15 * walkInterpolation.current;
      if (rArm) rArm.x -= leadTwistArm * 0.15 * walkInterpolation.current;
      const rShoulder = getTarget('RightShoulder');
      const lShoulder = getTarget('LeftShoulder');
      if (rShoulder) rShoulder.y += leadTwistArm * 0.2 * walkInterpolation.current;
      if (lShoulder) lShoulder.y += leadTwistArm * 0.2 * walkInterpolation.current;

      // Hạ nhẹ cẳng tay khi dừng/xoay người
      const rForeArm = getTarget('RightForeArm');
      const lForeArm = getTarget('LeftForeArm');
      if (rForeArm) rForeArm.x += armRelax * 0.2 * walkInterpolation.current;
      if (lForeArm) lForeArm.x += armRelax * 0.2 * walkInterpolation.current;

      // Bước chân (hai chân ngược pha nhau)
      const rUpLeg = getTarget('RightUpLeg');
      const lUpLeg = getTarget('LeftUpLeg');
      const rFoot = getTarget('RightFoot');
      const lFoot = getTarget('LeftFoot');
      const rLeg = getTarget('RightLeg');
      const lLeg = getTarget('LeftLeg');

      const rightPhase = walkCycle;
      const leftPhase = walkCycle + Math.PI;

      // Đùi vung ra trước và sau
      if (rUpLeg) {
        rUpLeg.x += Math.sin(rightPhase) * 0.15 * walkInterpolation.current;
        rUpLeg.z -= 0.06; // Tách đùi phải ra ngoài một chút để không dính hai chân
      }
      if (lUpLeg) {
        lUpLeg.x += Math.sin(leftPhase) * 0.15 * walkInterpolation.current;
        lUpLeg.z += 0.06; // Tách đùi trái ra ngoài một chút
      }

      // Mở mũi chân thành chữ V khi dừng/xoay để tránh hai chân bị song song quá mức
      if (rUpLeg) rUpLeg.y -= footVshape * 0.1 * walkInterpolation.current;
      if (lUpLeg) lUpLeg.y += footVshape * 0.1 * walkInterpolation.current;

      // Đầu gối gập tự nhiên về sau (Dùng bình phương để gối duỗi ra mượt mà, luôn giữ độ gập nhẹ 0.08 để không bao giờ thẳng băng như cây cơ)
      if (rLeg) rLeg.x -= (0.08 + Math.pow(Math.max(0, Math.cos(rightPhase)), 2) * 0.6) * walkInterpolation.current;
      if (lLeg) lLeg.x -= (0.08 + Math.pow(Math.max(0, Math.cos(leftPhase)), 2) * 0.6) * walkInterpolation.current;

      // Bàn chân gập cổ chân
      if (rFoot) rFoot.x -= Math.sin(rightPhase) * 0.25 * walkInterpolation.current;
      if (lFoot) lFoot.x -= Math.sin(leftPhase) * 0.25 * walkInterpolation.current;

      // HOẠT ẢNH TRỤ CHÂN XOAY NGƯỜI (Pivot Step)
      if (pivotPhase === 2) {
        const pt = phase < 1.0 ? (phase - 0.7) / 0.2 : (phase - 1.7) / 0.2;
        const pivotFootLift = Math.sin(pt * Math.PI); // Nhấc chân lên đặt xuống hình sin

        const isTurningLeft = phase < 1.0;
        // Khi xoay trái, trụ chân trái, nhấc chân phải bước vòng qua
        const steppingThigh = isTurningLeft ? rUpLeg : lUpLeg;
        const steppingKnee = isTurningLeft ? rLeg : lLeg;
        const steppingFoot = isTurningLeft ? rFoot : lFoot;

        if (steppingThigh) {
          steppingThigh.x -= pivotFootLift * 0.2 * walkInterpolation.current; // Nhấc đùi lên
          steppingThigh.z += (isTurningLeft ? -1 : 1) * pivotFootLift * 0.15 * walkInterpolation.current; // Dang ra
          steppingThigh.y -= angularVel * 0.2 * walkInterpolation.current; // Xoay đùi
        }
        if (steppingKnee) {
          steppingKnee.x -= pivotFootLift * 0.3 * walkInterpolation.current; // Gập gối
        }
        if (steppingFoot) {
          steppingFoot.y -= angularVel * 0.2 * walkInterpolation.current; // Xoay mũi chân
        }
      }

      (window as any).avatarPosition = clonedScene.position.clone();
    } else {
      clonedScene.position.set(0, -2.5, 0);
      clonedScene.rotation.set(0, 0, 0);
      (window as any).avatarPosition = clonedScene.position.clone();
    }

    if (currentGesture === 'greeting') {
      if (rArm) {
        rArm.z -= 1.0;
        rArm.y += 0.5 + getNoise(elapsed, 1.5, 0.1);
      }
      if (rForeArm) {
        // Vẫy tay tự nhiên hơn (kết hợp các nhịp khác nhau)
        const wave = Math.sin(elapsed * 5) * 0.15 + Math.sin(elapsed * 8) * 0.05;
        rForeArm.z -= 1.5 + wave;
        rForeArm.x += getNoise(elapsed, 2, 0.1);
      }
      if (!isMovingState && rUpLeg) rUpLeg.z -= 0.1; // Bước nhẹ chân phải sang bên (nếu không đi lại)

    } else if (currentGesture === 'explaining') {
      const bounce = getNoise(elapsed, 2.5, 0.15);
      const bounceL = getNoise(elapsed + 10, 2.0, 0.1); // Tay trái nhịp khác tay phải
      if (rArm) {
        rArm.z -= 0.2 + getNoise(elapsed, 1.2, 0.05);
        rArm.y -= 0.4 + getNoise(elapsed, 1.5, 0.05);
      }
      if (lArm) {
        lArm.z -= 0.2 + getNoise(elapsed + 5, 1.1, 0.05);
        lArm.y += 0.4 + getNoise(elapsed + 5, 1.4, 0.05);
      }
      if (rForeArm) {
        rForeArm.z -= 1.4 + bounce;
        rForeArm.x += getNoise(elapsed, 3, 0.1); // Xoay nhẹ cổ tay/khuỷu tay
      }
      if (lForeArm) {
        lForeArm.z += 1.4 + bounceL;
        lForeArm.x += getNoise(elapsed + 10, 3, 0.1);
      }
      // Tư thế giải thích: Một chân bước nhẹ lên trước
      if (!isMovingState) {
        if (lUpLeg) lUpLeg.x -= 0.15;
        if (rUpLeg) rUpLeg.x += 0.1;
      }

    } else if (currentGesture === 'thinking') {
      // Tư thế tay
      if (lArm) {
        lArm.z += 0.3 + getNoise(elapsed, 1, 0.05);
        lArm.x += 0.1;
        lArm.y += 0.5 + getNoise(elapsed, 1.5, 0.05);
      }
      if (lForeArm) {
        lForeArm.x -= 1;
        lForeArm.y -= 0;
        lForeArm.z += 1.7 + getNoise(elapsed, 1.2, 0.08); // Xoa cằm/chống cằm nhẹ
      }

      if (rArm) {
        rArm.z -= 0.6 + getNoise(elapsed, 1, 0.05);
        rArm.y -= 0.5 + getNoise(elapsed, 1.2, 0.05);
      }
      if (rForeArm) {
        rForeArm.z -= 1.9 + getNoise(elapsed, 1.5, 0.05);
      }

      ['Right', 'Left'].forEach((side) => {
        ['Index', 'Middle', 'Ring', 'Pinky'].forEach(finger => {
          [1, 2, 3].forEach(joint => {
            const b = getTarget(`${side}Hand${finger}${joint}`);
            if (b) b.x += 0.6 + getNoise(elapsed, 3, 0.05); // Ngón tay cử động linh hoạt hơn
          });
        });
        const thumb1 = getTarget(`${side}HandThumb1`);
        const thumb2 = getTarget(`${side}HandThumb2`);
        if (thumb1) thumb1.y += (side === 'Right' ? 0.4 : -0.4);
        if (thumb2) thumb2.x += 0.4;
      });

      if (head) { head.z += 0.1 + getNoise(elapsed, 0.8, 0.05); head.x += 0.05 + getNoise(elapsed, 1.2, 0.03); }

      // Tư thế chân: Đứng dồn trụ sang trái, chân phải chùng gối nghỉ ngơi
      if (hips) { hips.z += 0.03; hips.y += 0.05; } // Đứng thẳng hơn, dẹo hông rất nhẹ
      if (!isMovingState) {
        if (rUpLeg) { rUpLeg.z -= 0.05; rUpLeg.x -= 0.05; } // Nhấc đùi phải lên cực nhẹ
        if (rLeg) rLeg.x += 0.1; // Chùng gối phải nhẹ
      }

    } else if (currentGesture === 'shrugging') {
      const rShoulder = getTarget('RightShoulder');
      const lShoulder = getTarget('LeftShoulder');
      const shrugIntensity = Math.max(0, getNoise(elapsed, 2.5, 0.2)); // Chỉ nhún thỉnh thoảng, không nhún liên tục
      if (rShoulder) rShoulder.z += 0.1 + shrugIntensity;
      if (lShoulder) lShoulder.z -= 0.1 + shrugIntensity;

      if (rArm) { rArm.z -= 0.7 + getNoise(elapsed, 1.5, 0.05); rArm.y += 0.1; }
      if (lArm) { lArm.z += 0.7 + getNoise(elapsed, 1.5, 0.05); lArm.y -= 0.1; }

      if (rForeArm) { rForeArm.z -= 2 + getNoise(elapsed, 2, 0.1); }
      if (lForeArm) { lForeArm.z += 2 + getNoise(elapsed, 2, 0.1); }

      // Tư thế chân: Dang rộng hai chân ra thể hiện sự bất lực
      if (!isMovingState) {
        if (rUpLeg) rUpLeg.z -= 0.15;
        if (lUpLeg) lUpLeg.z += 0.15;
      }

      const rHand = getTarget('RightHand');
      const lHand = getTarget('LeftHand');
      if (rHand) rHand.x -= 1.6;
      if (lHand) lHand.x -= 1.6;

      ['Right', 'Left'].forEach((side) => {
        ['Index', 'Middle', 'Ring', 'Pinky'].forEach(finger => {
          [1, 2, 3].forEach(joint => {
            const b = getTarget(`${side}Hand${finger}${joint}`);
            if (b) b.x += 0.1 + getNoise(elapsed, 4, 0.02);
          });
        });
        const thumb = getTarget(`${side}HandThumb1`);
        if (thumb) thumb.y += (side === 'Right' ? 0.2 : -0.2);
      });

      if (head) { head.z -= 0.08 + getNoise(elapsed, 1, 0.03); head.x += 0.05; }
    } else {
      // Natural / Expressive / Energetic (Default idle gestures)
      // Dùng sóng chậm để luân phiên nhấc tay lên ngực rồi từ từ hạ xuôi dọc thân người
      const rWave = Math.sin(elapsed * 0.4);
      const lWave = Math.sin(elapsed * 0.35 + 1);

      const rActive = Math.max(0, rWave);
      const lActive = Math.max(0, lWave);

      // Bàn tay (Hand) vung/xoay trước cánh tay (Anticipation) +0.4 phase
      const rWaveHand = Math.sin(elapsed * 0.4 + 0.4);
      const lWaveHand = Math.sin(elapsed * 0.35 + 1.4);
      const rActiveHand = Math.max(0, rWaveHand);
      const lActiveHand = Math.max(0, lWaveHand);

      const rhythm = getNoise(elapsed, 2.0, 0.15 * scale) * rActive;
      const rhythmL = getNoise(elapsed + 10, 1.8, 0.15 * scale) * lActive;

      // Tay xuôi tự nhiên khi Active = 0, gập lên ngực khi Active > 0
      if (rArm) {
        rArm.x += 0.15; // TRỤC X DƯƠNG (+) kéo cùi chỏ tới trước một chút để tay không bị ngửa ra sau lưng
        rArm.z -= rActive * 0.05 + rhythm * 0.2;
        rArm.y -= rActive * 0.1 + Math.abs(rhythm) * 1.5;
      }
      if (lArm) {
        lArm.x += 0.15;
        lArm.z += lActive * 0.05 + rhythmL * 0.2;
        lArm.y += lActive * 0.1 + Math.abs(rhythmL) * 1.5;
      }
      if (rForeArm) {
        rForeArm.z -= rActive * 1.25 + Math.abs(rhythm) * 2.0;
        rForeArm.x += getNoise(elapsed, 3.5, 0.08 * scale) * rActive;
      }
      if (lForeArm) {
        lForeArm.z += lActive * 1.25 + Math.abs(rhythmL) * 2.0;
        lForeArm.x += getNoise(elapsed + 10, 3.5, 0.08 * scale) * lActive;
      }

      const rHand = getTarget('RightHand');
      const lHand = getTarget('LeftHand');
      if (rHand) {
        rHand.z += rActiveHand * 0.4; // Ngóc cổ tay lên trước khi gập tay
        rHand.x -= rActiveHand * 0.3; // Mở xòe cổ tay ra ngoài
      }
      if (lHand) {
        lHand.z -= lActiveHand * 0.4;
        lHand.x -= lActiveHand * 0.3;
      }
    }

    // ─── APPLY SMOOTH TRANSITION (SLERP) ───
    const lerpFactor = 15 * delta; // Điều chỉnh theo delta
    for (const name of Object.keys(targetOffsets.current)) {
      const bone = getBone(name);
      const target = targetOffsets.current[name];
      const curr = currentOffsets.current[name];
      if (bone && origQuats.current[name] && curr) {
        // Áp dụng mượt mà (Lerp)
        curr.x = THREE.MathUtils.lerp(curr.x, target.x, lerpFactor);
        curr.y = THREE.MathUtils.lerp(curr.y, target.y, lerpFactor);
        curr.z = THREE.MathUtils.lerp(curr.z, target.z, lerpFactor);

        bone.quaternion.copy(origQuats.current[name]);
        if (curr.x !== 0) bone.rotateX(curr.x);
        if (curr.y !== 0) bone.rotateY(curr.y);
        if (curr.z !== 0) bone.rotateZ(curr.z);
      }
    }
  });

  return (
    <group scale={1.1} position={[0, -1.2, 0]}>
      <primitive object={clonedScene} />
    </group>
  );
}

function RobotAvatar({ speaking, gesture }: { speaking: boolean, gesture: string }) {
  const headRef = useRef<any>(null);
  const mouthRef = useRef<any>(null);
  const groupRef = useRef<any>(null);

  useEffect(() => {
    let animationFrameId: number;
    let startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;

      if (groupRef.current) {
        if (gesture === 'happy') {
          groupRef.current.position.y = -0.5 + Math.abs(Math.sin(elapsed * 8)) * 0.3;
        } else if (gesture === 'waving') {
          groupRef.current.rotation.y = Math.sin(elapsed * 6) * 0.4;
          groupRef.current.position.y = -0.5;
        } else if (gesture === 'pointing') {
          groupRef.current.rotation.y = 0.5;
          groupRef.current.position.y = -0.5;
        } else {
          groupRef.current.rotation.y = 0;
          groupRef.current.position.y = -0.5;
        }
      }

      if (headRef.current) {
        if (speaking) {
          headRef.current.rotation.y = Math.sin(elapsed * 5) * 0.1;
          headRef.current.position.y = Math.sin(elapsed * 10) * 0.05;
        } else {
          headRef.current.rotation.y = 0;
          headRef.current.position.y = 0;
        }
      }

      if (mouthRef.current) {
        if (speaking) {
          mouthRef.current.scale.y = 0.2 + Math.abs(Math.sin(elapsed * 15)) * 0.8;
        } else {
          mouthRef.current.scale.y = 0.1;
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [speaking, gesture]);

  return (
    <group ref={groupRef} position={[0, -0.5, 0]} scale={1.5}>
      {/* Body */}
      <Box args={[1.5, 1.5, 1]} position={[0, -1.2, 0]}>
        <meshStandardMaterial color="#30336b" />
      </Box>
      {/* Head Group */}
      <group ref={headRef}>
        <Box args={[1.2, 1.2, 1.2]} position={[0, 0.5, 0]}>
          <meshStandardMaterial color="#686de0" />
        </Box>
        <Sphere args={[0.15]} position={[-0.3, 0.6, 0.6]}>
          <meshStandardMaterial color="#f6e58d" emissive="#f6e58d" emissiveIntensity={0.5} />
        </Sphere>
        <Sphere args={[0.15]} position={[0.3, 0.6, 0.6]}>
          <meshStandardMaterial color="#f6e58d" emissive="#f6e58d" emissiveIntensity={0.5} />
        </Sphere>
        <Box ref={mouthRef} args={[0.6, 0.1, 0.1]} position={[0, 0.2, 0.6]}>
          <meshStandardMaterial color="#eb4d4b" />
        </Box>
        <Cylinder args={[0.05, 0.05, 0.5]} position={[0, 1.3, 0]}>
          <meshStandardMaterial color="#c7ecee" />
        </Cylinder>
        <Sphere args={[0.1]} position={[0, 1.6, 0]}>
          <meshStandardMaterial color="#eb4d4b" emissive="#eb4d4b" emissiveIntensity={0.5} />
        </Sphere>
      </group>
    </group>
  );
}

interface Scene {
  id: string;
  title: string;
  script: string;
  gesture: string;
  isMoving?: boolean;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  snapshotUrl: string | null;
  mediaUrl: string | null;
  mediaScale?: number;
  mediaWidth?: number;
  mediaHeight?: number;
}

export default function VideoStudio() {
  const { selectedBrand } = useBrand();
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [projects, setProjects] = useState<any[]>([]);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('Untitled Video');

  const [scenes, setScenes] = useState<Scene[]>([
    {
      id: 'scene-1',
      title: 'Scene 1',
      script: 'Hello! I am your AI avatar. Welcome to SocialFlow 3D Video Studio.',
      gesture: 'natural',
      cameraPosition: [0, -1.6, 2.0],
      cameraTarget: [0, -1.8, 0],
      snapshotUrl: null,
      mediaUrl: null,
      mediaScale: 1.0,
      mediaWidth: 320,
      mediaHeight: 180
    }
  ]);
  const [activeSceneId, setActiveSceneId] = useState('scene-1');
  const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0];

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('/new-default-model.glb');
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [playingIndex, setPlayingIndex] = useState(-1);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load Projects
  useEffect(() => {
    if (selectedBrand) {
      loadProjects();
      loadMediaAssets();
    }
  }, [selectedBrand]);

  const loadMediaAssets = async () => {
    try {
      const data = await api.getMedia();
      setMediaAssets(data);
    } catch (err) {
      console.error('Failed to load media assets', err);
    }
  };

  const loadProjects = async () => {
    if (!selectedBrand) return;
    setIsLoadingProjects(true);
    try {
      const data = await api.getVideoProjects(selectedBrand.id);
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setIsLoadingProjects(false);
    }
  };
  const deleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedBrand) return;
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.deleteVideoProject(selectedBrand.id, projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error(err);
      alert('Error deleting project');
    }
  };


  const createNewProject = async (templateId: 'empty' | 'news' | 'edu' | 'pop-music') => {
    if (!selectedBrand) return;
    try {
      const title = templateId === 'news' ? 'Breaking News' : templateId === 'edu' ? 'Knowledge Sharing' : templateId === 'pop-music' ? 'Pop Music 2026' : 'New Video Project';
      const p = await api.createVideoProject(selectedBrand.id, {
        title,
        avatarUrl: '/new-default-model.glb',
        voiceUri: ''
      });
      setActiveProjectId(p.id);
      setProjectTitle(title);

      let initialScenes: Scene[] = [];
      if (templateId === 'news') {
        initialScenes = [
          { id: crypto.randomUUID(), title: 'Headline', script: 'Welcome to today\'s breaking news.', gesture: 'greeting', cameraPosition: [-0.5, -1.7, 2.2], cameraTarget: [0.5, -1.8, 0], snapshotUrl: null, mediaUrl: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=800&q=80', mediaScale: 1.2, mediaWidth: 400, mediaHeight: 225 },
          { id: crypto.randomUUID(), title: 'Market', script: 'The tech market is witnessing major milestones with the rise of AI.', gesture: 'explaining', cameraPosition: [0.8, -1.7, 1.8], cameraTarget: [-0.5, -1.8, 0], snapshotUrl: null, mediaUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80', mediaScale: 1.0, mediaWidth: 320, mediaHeight: 320 }
        ];
      } else if (templateId === 'edu') {
        initialScenes = [
          { id: crypto.randomUUID(), title: 'Problem', script: 'Do you ever feel overwhelmed by your daily tasks?', gesture: 'thinking', cameraPosition: [0.5, -1.7, 2.0], cameraTarget: [0.5, -1.8, 0], snapshotUrl: null, mediaUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=800&q=80', mediaScale: 1.0, mediaWidth: 320, mediaHeight: 180 },
          { id: crypto.randomUUID(), title: 'Solution', script: 'The secret is the Pomodoro technique: 25 minutes of work, 5 minutes of rest.', gesture: 'explaining', cameraPosition: [-0.8, -1.8, 1.5], cameraTarget: [0, -1.9, 0], snapshotUrl: null, mediaUrl: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80', mediaScale: 1.1, mediaWidth: 280, mediaHeight: 400 },
          { id: crypto.randomUUID(), title: 'Conclusion', script: 'Try it today and see the difference!', gesture: 'energetic', cameraPosition: [0, -1.7, 2.5], cameraTarget: [0, -1.8, 0], snapshotUrl: null, mediaUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80', mediaScale: 1.0, mediaWidth: 400, mediaHeight: 200 }
        ];
      } else if (templateId === 'pop-music') {
        setAspectRatio('9:16');
        initialScenes = [
          { id: crypto.randomUUID(), title: 'Opening', script: "Hello! Have you noticed pop music feels different lately? The era of global megahits is fading.", gesture: 'greeting', isMoving: true, cameraPosition: [0.6, -2.0, 1.5], cameraTarget: [0, -2.3, 0], snapshotUrl: null, mediaUrl: null, mediaScale: 1.0, mediaWidth: 300, mediaHeight: 200 },
          { id: crypto.randomUUID(), title: 'Algorithms', script: "Today, personalized algorithms rule. We no longer share the same playlists; the app feeds you exactly what you want.", gesture: 'explaining', isMoving: true, cameraPosition: [0, -1.8, 1.0], cameraTarget: [0, -1.8, 0], snapshotUrl: null, mediaUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', mediaScale: 1.0, mediaWidth: 300, mediaHeight: 200 },
          { id: crypto.randomUUID(), title: 'AI Tools', script: "Another huge shift? AI-powered tools. Artists now create professional tracks entirely from a bedroom laptop. But does it lack soul?", gesture: 'thinking', isMoving: true, cameraPosition: [0.6, -1.8, 1.5], cameraTarget: [0, -1.8, 0], snapshotUrl: null, mediaUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', mediaScale: 1.0, mediaWidth: 300, mediaHeight: 200 },
          { id: crypto.randomUUID(), title: 'Closing', script: "Ultimately, the platforms change, but great music always finds a way. What's your favorite track right now? Let me know!", gesture: 'energetic', isMoving: false, cameraPosition: [0, -2.0, 1.0], cameraTarget: [0, -2.0, 0], snapshotUrl: null, mediaUrl: null, mediaScale: 1.0, mediaWidth: 300, mediaHeight: 200 }
        ];
      } else {
        initialScenes = [
          { id: crypto.randomUUID(), title: 'Intro', script: 'Hello! I am your AI avatar.', gesture: 'greeting', cameraPosition: [0, -1.7, 2.5], cameraTarget: [0, -1.8, 0], snapshotUrl: null, mediaUrl: null, mediaScale: 1.0, mediaWidth: 320, mediaHeight: 180 }
        ];
      }

      setScenes(initialScenes);
      setActiveSceneId(initialScenes[0].id);
      setAvatarUrl(p.avatarUrl);
      setView('editor');
    } catch (err) {
      console.error(err);
      showToast('Error creating new project');
    }
  };

  const openProject = async (p: any) => {
    setActiveProjectId(p.id);
    setProjectTitle(p.title || 'Untitled Video');
    setAvatarUrl(p.avatarUrl || '/new-default-model.glb');

    // Tìm voice trong availableVoices (sẽ được cập nhật sau khi load)
    if (p.voiceUri) {
      const v = window.speechSynthesis.getVoices().find(v => v.voiceURI === p.voiceUri);
      if (v) setVoice(v);
    }

    if (p.scenes && p.scenes.length > 0) {
      const mapped = p.scenes.map((s: any) => ({
        id: s.id,
        title: s.title,
        script: s.script,
        gesture: s.gesture,
        cameraPosition: Array.isArray(s.cameraPosition) ? s.cameraPosition : s.cameraPosition.split(',').map(Number),
        cameraTarget: Array.isArray(s.cameraTarget) ? s.cameraTarget : s.cameraTarget.split(',').map(Number),
        snapshotUrl: s.snapshotUrl,
        mediaUrl: s.mediaUrl,
        mediaScale: s.mediaScale || 1.0,
        mediaWidth: s.mediaWidth || 320,
        mediaHeight: s.mediaHeight || 180
      }));
      setScenes(mapped);
      setActiveSceneId(mapped[0].id);
    }
    setView('editor');
  };

  const saveProject = async () => {
    if (!selectedBrand || !activeProjectId) return;
    try {
      let currentSnapshotUrl = activeScene.snapshotUrl;
      const canvas = document.querySelector('canvas');
      if (canvas) {
        currentSnapshotUrl = canvas.toDataURL('image/jpeg', 0.5);
      }

      await api.updateVideoProject(selectedBrand.id, activeProjectId, {
        title: projectTitle,
        avatarUrl,
        voiceUri: voice?.voiceURI || '',
        scenes: scenes.map((s, index) => ({
          ...s,
          snapshotUrl: s.id === activeSceneId ? currentSnapshotUrl : s.snapshotUrl,
          cameraPosition: s.id === activeSceneId ? globalCameraPos.join(',') : s.cameraPosition.join(','),
          cameraTarget: s.id === activeSceneId ? globalCameraTarget.join(',') : s.cameraTarget.join(','),
          orderIndex: index
        }))
      });
      if (canvas) {
        updateScene({ snapshotUrl: currentSnapshotUrl, cameraPosition: globalCameraPos, cameraTarget: globalCameraTarget });
      }
      showToast('Project saved successfully! 🎉');
    } catch (err) {
      console.error(err);
      showToast('Error saving project ❌');
    }
  };


  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const filteredVoices = voices
        .filter(v => v.lang.startsWith('en') || v.lang.startsWith('vi'))
        .sort((a, b) => {
          const aPremium = a.name.includes('Google') || a.name.includes('Natural') || a.name.includes('Premium');
          const bPremium = b.name.includes('Google') || b.name.includes('Natural') || b.name.includes('Premium');
          if (aPremium && !bPremium) return -1;
          if (!aPremium && bPremium) return 1;
          return 0;
        });

      setAvailableVoices(filteredVoices);

      setVoice(prev => {
        if (!prev && filteredVoices.length > 0) {
          const viVoice = filteredVoices.find(v => v.lang.startsWith('vi'));
          return viVoice || filteredVoices[0];
        }
        return prev;
      });
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const updateScene = (updates: Partial<Scene>) => {
    setScenes(prev => prev.map(s => s.id === activeSceneId ? { ...s, ...updates } : s));
  };

  const addScene = () => {
    const newId = crypto.randomUUID();
    setScenes(prev => [...prev, {
      id: newId,
      title: `Scene ${prev.length + 1}`,
      script: 'A new scene begins...',
      gesture: 'idle',
      cameraPosition: globalCameraPos,
      cameraTarget: globalCameraTarget,
      snapshotUrl: null,
      mediaUrl: null,
      mediaScale: 1.0,
      mediaWidth: 320,
      mediaHeight: 180
    }]);
    setActiveSceneId(newId);
  };

  const deleteScene = (id: string) => {
    if (scenes.length === 1) return;
    setScenes(prev => prev.filter(s => s.id !== id));
    if (activeSceneId === id) setActiveSceneId(scenes[0].id);
  };

  const takeSnapshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      updateScene({
        snapshotUrl: canvas.toDataURL('image/jpeg', 0.5),
        cameraPosition: globalCameraPos,
        cameraTarget: globalCameraTarget
      });
    }
  };

  // Playback engine
  useEffect(() => {
    let isCancelled = false;

    if (playingIndex >= 0 && playingIndex < scenes.length) {
      const sceneToPlay = scenes[playingIndex];
      setActiveSceneId(sceneToPlay.id); // switch camera angle

      const timeoutId = setTimeout(() => {
        if (isCancelled) return;

        if (!sceneToPlay.script.trim()) {
          setPlayingIndex(prev => prev + 1);
          return;
        }

        // Ensure global variable exists
        if (!(window as any).lipSyncTargets) {
          (window as any).lipSyncTargets = { mouthOpen: 0, mouthSmile: 0, mouthPucker: 0 };
        }

        const utterance = new SpeechSynthesisUtterance(sceneToPlay.script);
        if (voice) utterance.voice = voice;
        utterance.rate = 0.95; // Giảm nhẹ tốc độ để nghe tự nhiên, không bị líu lưỡi
        utterance.pitch = 0.98; // Giảm nhẹ cao độ để bớt cảm giác chói tai (chipmunk)

        utterance.onstart = () => {
          if (!isCancelled) setIsSpeaking(true);
        };
        utterance.onboundary = (e) => {
          if (isCancelled) return;
          if (e.name === 'word') {
            // Phân tích nguyên âm của từ để tạo khẩu hình (Lip Sync) cho tiếng Việt
            const wordRaw = sceneToPlay.script.substring(e.charIndex).split(/[\s,.!?"'\-—;:]+/)[0];
            const word = wordRaw.toLowerCase();

            let tOpen = 0.2;
            let tSmile = 0;
            let tPucker = 0;
            let wordDuration = 0.25;

            if (/[aăâ]/.test(word)) {
              tOpen = 0.8 + Math.random() * 0.2; // Âm A
              wordDuration = 0.3;
            } else if (/[oôơuư]/.test(word)) {
              tPucker = 0.9; // Âm O, U
              tOpen = 0.5;
              wordDuration = 0.25;
            } else if (/[eêiy]/.test(word)) {
              tSmile = 0.7; // Âm E, I
              tOpen = 0.4;
              wordDuration = 0.25;
            } else {
              tOpen = 0.4 + Math.random() * 0.2; // Phụ âm
              wordDuration = 0.15;
            }

            (window as any).lipSyncTargets = {
              mouthOpen: tOpen,
              mouthSmile: tSmile,
              mouthPucker: tPucker,
              timer: wordDuration,
              maxTimer: wordDuration
            };

            // Auto gesture logic
            if (sceneToPlay.gesture === 'auto') {
              const currentWord = sceneToPlay.script.substring(e.charIndex).split(/[\s,.!?"'\-—;:]+/)[0].toLowerCase();

              const greetings = ['chào', 'hello', 'hi', 'xin', 'welcome'];
              const energetics = ['tuyệt', 'wow', 'super', 'mạnh', 'vui', 'great', 'awesome', 'đỉnh', 'nhất', 'tốt'];
              const calms = ['nhưng', 'tuy', 'từ', 'buồn', 'chậm', 'but', 'tuy nhiên', 'thì', 'từ từ'];
              const explainings = ['ví', 'như', 'rằng', 'là', 'nghĩa', 'thực', 'cụ', 'vì', 'sao', 'cho', 'để'];
              const thinkings = ['nghĩ', 'chắc', 'lẽ', 'suy', 'có', 'thể', 'tưởng'];
              const shruggings = ['không', 'chưa', 'kệ', 'chịu', 'who'];

              const setGesture = (g: string) => {
                (window as any).currentAutoGesture = g;
                clearTimeout((window as any).autoGestureTimeout);
                
                let duration = 0;
                if (g === 'greeting') duration = 800; // Chào nhanh (0.8s) để tay rớt xuống tự nhiên
                else if (['thinking', 'shrugging', 'energetic'].includes(g)) duration = 2500;
                
                if (duration > 0) {
                  (window as any).autoGestureTimeout = setTimeout(() => {
                    (window as any).currentAutoGesture = 'natural';
                  }, duration);
                }
              };

              if (greetings.includes(currentWord)) setGesture('greeting');
              else if (energetics.includes(currentWord)) setGesture('energetic');
              else if (explainings.includes(currentWord)) setGesture('explaining');
              else if (thinkings.includes(currentWord)) setGesture('thinking');
              else if (shruggings.includes(currentWord)) setGesture('shrugging');
              else if (calms.includes(currentWord)) setGesture('calm');

              // Fallback
              const prevChar = e.charIndex > 0 ? sceneToPlay.script[e.charIndex - 1] : '';
              const prevPrevChar = e.charIndex > 1 ? sceneToPlay.script[e.charIndex - 2] : '';
              if (['.', '!', '?', ','].includes(prevChar) || ['.', '!', '?', ','].includes(prevPrevChar)) {
                const randomG = ['natural', 'expressive', 'explaining'][Math.floor(Math.random() * 3)];
                if (!['greeting', 'thinking', 'shrugging'].includes((window as any).currentAutoGesture)) {
                  setGesture(randomG);
                }
              }
            }
          }
        };
        utterance.onend = () => {
          if (isCancelled) return;
          setIsSpeaking(false);
          setPlayingIndex(prev => prev + 1);
        };

        utterance.onerror = (e) => {
          if (isCancelled) return;
          setIsSpeaking(false);
          setPlayingIndex(-1);
        };

        // Gán utterance vào window để chống bộ thu gom rác (garbage collection) của trình duyệt làm đứt tiếng
        (window as any).currentUtterance = utterance;
        
        window.speechSynthesis.speak(utterance);
      }, 500); // 500ms transition delay

      return () => {
        isCancelled = true;
        clearTimeout(timeoutId);
        window.speechSynthesis.cancel();
      };
    } else if (playingIndex >= scenes.length) {
      setPlayingIndex(-1); // Finished
    }
  }, [playingIndex, scenes, voice]);

  const playStoryboard = () => {
    window.speechSynthesis.cancel();
    setPlayingIndex(0);
  };

  const stopPlayback = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setPlayingIndex(-1);
  };

  const [isRecording, setIsRecording] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const canvas = document.querySelector('canvas');
      if (!canvas) return showToast('Canvas 3D chưa sẵn sàng.');

      alert("LƯU Ý ĐỂ THU ÂM TIẾNG GIỌNG ĐỌC AI:\n\nGiọng nói của avatar KHÔNG phát qua tab trình duyệt mà phát thẳng ra hệ thống.\n\nKhi hộp thoại Share Screen hiện lên, bạn BẮT BUỘC phải:\n1. Chọn tab 'Toàn Màn Hình' (Entire Screen)\n2. Bật công tắc 'Chia sẻ âm thanh hệ thống' (Share system audio)\n3. Nhấn Chia sẻ.");

      // 1. Capture luồng video từ Canvas (Kết hợp WebGL và MediaOverlay)
      const webglCanvas = document.querySelector('#main-webgl-canvas canvas') as HTMLCanvasElement;
      if (!webglCanvas) return showToast('Canvas 3D chưa sẵn sàng.');

      const mixedCanvas = document.createElement('canvas');
      mixedCanvas.width = webglCanvas.width;
      mixedCanvas.height = webglCanvas.height;
      const ctx = mixedCanvas.getContext('2d');
      
      let isRecordingActive = true;
      const drawMixedFrame = () => {
        if (!isRecordingActive || !ctx) return;
        
        ctx.drawImage(webglCanvas, 0, 0, mixedCanvas.width, mixedCanvas.height);
        
        const overlayContainer = document.querySelector('.media-overlay-container') as HTMLDivElement;
        const overlayMedia = document.querySelector('.media-overlay-content') as HTMLVideoElement | HTMLImageElement;
        
        if (overlayContainer && overlayMedia) {
          const canvasRect = webglCanvas.getBoundingClientRect();
          const overlayRect = overlayContainer.getBoundingClientRect();
          
          const scaleX = mixedCanvas.width / canvasRect.width;
          const scaleY = mixedCanvas.height / canvasRect.height;
          
          const x = (overlayRect.left - canvasRect.left) * scaleX;
          const y = (overlayRect.top - canvasRect.top) * scaleY;
          const w = overlayRect.width * scaleX;
          const h = overlayRect.height * scaleY;
          
          try {
            // Draw background of overlay (dark glassmorphism)
            ctx.fillStyle = 'rgba(15, 12, 41, 0.85)';
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, 12 * scaleX);
            ctx.fill();
            
            // Draw media content inside overlay
            if (overlayMedia instanceof HTMLVideoElement && overlayMedia.readyState >= 2) {
               ctx.drawImage(overlayMedia, x, y, w, h);
            } else if (overlayMedia instanceof HTMLImageElement && overlayMedia.complete) {
               ctx.drawImage(overlayMedia, x, y, w, h);
            }
          } catch (e: any) {
            console.error('Canvas drawImage error:', e);
            if (!isRecordingActive) return; // Only alert once
          }
        }
        
        requestAnimationFrame(drawMixedFrame);
      };
      drawMixedFrame();

      const canvasStream = mixedCanvas.captureStream(30);

      // 2. Yêu cầu Share Screen để lấy System Audio
      const displayMediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const audioTracks = displayMediaStream.getAudioTracks();
      if (audioTracks.length === 0) {
        showToast("Note: You didn't select 'Share system audio'. The video will have no sound.");
      }

      // 3. Gộp Video + Audio
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioTracks
      ]);

      let mimeType = 'video/webm';
      let extension = 'webm';

      // Luôn ghi dưới dạng WebM để đảm bảo FFmpeg sẽ convert audio Opus → AAC
      // Chrome hỗ trợ 'video/mp4' nhưng vẫn dùng Opus audio → Windows Media Player không phát được
      if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mimeType = 'video/webm;codecs=h264';
      }

      mediaRecorderRef.current = new MediaRecorder(combinedStream, { mimeType });
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        isRecordingActive = false;
        const blob = new Blob(recordedChunks.current, { type: mimeType });
        recordedChunks.current = [];
        displayMediaStream.getTracks().forEach(track => track.stop());

        if (extension === 'webm') {
          showToast('Converting to MP4... This may take a minute.');
          setIsConverting(true);
          try {
            const { FFmpeg } = await import('@ffmpeg/ffmpeg');
            const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

            const ffmpeg = new FFmpeg();
            ffmpeg.on('log', ({ message }: any) => console.log('[FFmpeg]', message));

            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
            await ffmpeg.load({
              coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
              wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });

            await ffmpeg.writeFile('input.webm', await fetchFile(blob));
            
            // Copy video (already H264) + convert audio Opus → AAC
            await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'copy', '-c:a', 'aac', 'output.mp4']);

            const data = await ffmpeg.readFile('output.mp4');
            const mp4Blob = new Blob([data as any], { type: 'video/mp4' });

            const url = URL.createObjectURL(mp4Blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `video-export-${Date.now()}.mp4`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Conversion complete! 🎉');
          } catch (err: any) {
            console.error('Server conversion error:', err);
            showToast('MP4 conversion failed. Downloading as .webm instead.');
            // Fallback to webm download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `video-export-${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
          } finally {
            setIsConverting(false);
          }
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `video-export-${Date.now()}.${extension}`;
          a.click();
          URL.revokeObjectURL(url);
        }
      };

      recordedChunks.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Auto play
      playStoryboard();

    } catch (err) {
      console.error(err);
      // alert('Không thể bắt đầu quay. Cần cấp quyền chia sẻ màn hình/âm thanh.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopPlayback();
    }
  };

  if (view === 'dashboard') {
    return (
      <AppShell>
        <div style={{ padding: '40px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
              {/* Removed Back button */}
              <div>
                <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <IconFilm color="var(--accent)" size={32} /> Video Studio
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 16 }}>
                  Manage and create professional 3D avatar videos for {selectedBrand?.name || 'your brand'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    createNewProject(e.target.value as any);
                    e.target.value = '';
                  }
                }}
                className="btn btn-primary"
                style={{ padding: '12px 24px', fontSize: 16, appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">+ Create from Template...</option>
                <option value="empty">Blank Project</option>
                <option value="news">Template: Breaking News (2 scenes)</option>
                <option value="edu">Template: Education (3 scenes)</option>
                <option value="pop-music">Template: Pop Music 2026 (8 scenes)</option>
              </select>
            </div>
          </div>

          {isLoadingProjects ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading projects...</div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 80, background: 'var(--bg-card)', borderRadius: 16, border: '1px dashed var(--border)' }}>
              <IconFilm size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
              <h3>No videos yet</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Create your first video to get started.</p>
              <button className="btn btn-primary" onClick={() => createNewProject('empty')}>Create Blank Project</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
              {projects.map(p => (
                <div key={p.id} style={{ background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} onClick={() => openProject(p)} className="hover:border-accent">
                  <div style={{ height: 160, background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {p.scenes?.[0]?.snapshotUrl ? (
                      <img src={p.scenes[0].snapshotUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Snapshot" />
                    ) : (
                      <IconFilm size={48} color="var(--text-muted)" style={{ opacity: 0.3 }} />
                    )}
                    <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                      {p.scenes?.length || 0} Scenes
                    </div>
                  </div>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 600 }}>{p.title || 'Untitled Video'}</h3>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
                          Updated: {new Date(p.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteProject(p.id, e)}
                        style={{ background: 'rgba(255, 71, 87, 0.1)', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '6px', borderRadius: '4px' }}
                        title="Delete Project"
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'var(--bg-body)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <style>{`
        .studio-container {
          display: flex;
          flex: 1;
          overflow: hidden;
          flex-direction: row;
        }
        .studio-editor-sidebar {
          width: 320px;
          border-right: 1px solid var(--border);
          flex-shrink: 0;
          background: var(--bg-card);
          display: flex;
          flex-direction: column;
        }
        .studio-timeline-sidebar {
          width: 280px;
          border-left: 1px solid var(--border);
          flex-shrink: 0;
          background: var(--bg-body);
          display: flex;
          flex-direction: column;
          z-index: 10;
          box-shadow: -5px 0 20px rgba(0,0,0,0.2);
        }
        .studio-canvas-area {
          flex: 1;
          position: relative;
          background: #111113;
          min-width: 0;
        }
        @media (max-width: 1024px) {
          .studio-container {
            flex-direction: column;
            overflow-y: auto !important;
            overflow-x: hidden;
          }
          .studio-editor-sidebar, .studio-timeline-sidebar {
            width: 100% !important;
            border-right: none !important;
            border-left: none !important;
            border-bottom: 1px solid var(--border);
            flex: none;
            box-shadow: none !important;
          }
          .studio-canvas-area {
            min-height: 50vh;
            flex: none;
          }
        }
      `}</style>
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '16px 32px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconFilm color="var(--accent)" />
                <input
                  value={projectTitle}
                  onChange={e => setProjectTitle(e.target.value)}
                  style={{ background: 'transparent', border: 'none', borderBottom: '1px dashed var(--border)', color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', outline: 'none', width: '400px' }}
                />
              </h1>
              <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Sequence scenes, camera angles, and scripts for your AI video.</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => { loadProjects(); setView('dashboard'); }}>
                &larr; Dashboard
              </button>
              <button className="btn btn-secondary" onClick={saveProject}>
                <IconDownload size={18} /> Save Project
              </button>
              <button
                className="btn"
                style={{ background: isRecording ? '#ff4757' : 'var(--bg-glass)', border: '1px solid var(--border)', color: 'white' }}
                onClick={isRecording ? stopRecording : startRecording}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isRecording ? <div style={{ width: 8, height: 8, background: 'white', borderRadius: 2 }} /> : <div style={{ width: 10, height: 10, background: '#ff4757', borderRadius: '50%' }} />}
                  {isRecording ? 'Stop Recording' : 'Record Video'}
                </div>
              </button>
              <button className="btn btn-primary" onClick={playingIndex >= 0 ? stopPlayback : playStoryboard}>
                {playingIndex >= 0 ? <><IconVolumeX size={18} /> Stop Playing</> : <><IconPlay size={18} /> Play Storyboard</>}
              </button>
            </div>
          </div>
        </header>

        <div className="studio-container">

          {/* Scene Editor Sidebar */}
          <aside className="studio-editor-sidebar">
            <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, marginRight: 8 }}>
                  <input
                    value={activeScene.title}
                    onChange={(e) => updateScene({ title: e.target.value })}
                    style={{ fontSize: 14, fontWeight: 700, margin: 0, background: 'transparent', border: 'none', borderBottom: '1px dashed var(--border)', color: 'inherit', outline: 'none', width: '100%' }}
                    placeholder="Scene Title"
                  />
                </div>
                {scenes.length > 1 && (
                  <button
                    onClick={() => deleteScene(activeSceneId)}
                    style={{ background: 'rgba(255, 71, 87, 0.1)', border: '1px solid rgba(255, 71, 87, 0.3)', color: 'var(--error)', cursor: 'pointer', fontSize: 11, padding: '4px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                  >
                    <IconTrash size={12} /> Delete Scene
                  </button>
                )}
              </div>

              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Script</label>
              <DebouncedTextarea
                value={activeScene.script}
                onChange={val => updateScene({ script: val })}
                style={{
                  width: '100%', height: 120, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '8px', padding: 12, color: 'white', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5, marginBottom: 20
                }}
              />

              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Avatar Gesture</label>
              <select
                value={activeScene.gesture}
                onChange={e => updateScene({ gesture: e.target.value })}
                style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: 13, marginBottom: 20 }}
              >
                <option value="auto">Auto-sync</option>
                <option value="natural">Natural</option>
                <option value="expressive">Expressive</option>
                <option value="explaining">Explaining</option>
                <option value="thinking">Thinking</option>
                <option value="shrugging">Shrugging</option>
                <option value="calm">Calm</option>
                <option value="energetic">Energetic</option>
                <option value="greeting">Greeting</option>
              </select>

              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Movement</label>
              <select
                value={activeScene.isMoving ? 'walking' : 'standing'}
                onChange={e => updateScene({ isMoving: e.target.value === 'walking' })}
                style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: 13, marginBottom: 20 }}
              >
                <option value="standing">Standing Still</option>
                <option value="walking">Walking Around</option>
              </select>

              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={e => setAspectRatio(e.target.value as any)}
                style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: 13, marginBottom: 20 }}
              >
                <option value="16:9">Landscape (16:9)</option>
                <option value="9:16">Portrait / Phone (9:16)</option>
              </select>

              <h4 style={{ fontSize: 13, fontWeight: 600, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16, marginBottom: 12 }}>Media Context</h4>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Display image or video next to the avatar:</p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  value={activeScene.mediaUrl || ''}
                  onChange={(e) => updateScene({ mediaUrl: e.target.value })}
                  placeholder="Enter URL (https://...)"
                  style={{ flex: 1, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: 13, minWidth: 0 }}
                />
                <select
                  onChange={(e) => updateScene({ mediaUrl: e.target.value })}
                  style={{ width: 100, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', fontSize: 12, padding: '0 8px' }}
                >
                  <option value="">Media Library</option>
                  {mediaAssets.filter(a => a.contentType.startsWith('image/') || a.contentType.startsWith('video/')).map(a => (
                    <option key={a.id} value={a.url}>{a.originalName}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Width (px)</label>
                  <input
                    type="number"
                    value={activeScene.mediaWidth ?? 320}
                    onChange={(e) => updateScene({ mediaWidth: parseInt(e.target.value) || 320 })}
                    style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px 8px', color: 'white', fontSize: 12 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Height (px)</label>
                  <input
                    type="number"
                    value={activeScene.mediaHeight ?? 180}
                    onChange={(e) => updateScene({ mediaHeight: parseInt(e.target.value) || 180 })}
                    style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px 8px', color: 'white', fontSize: 12 }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1, fontSize: 10, padding: '4px 0' }} onClick={() => updateScene({ mediaWidth: 320, mediaHeight: 180 })}>16:9</button>
                <button className="btn btn-secondary" style={{ flex: 1, fontSize: 10, padding: '4px 0' }} onClick={() => updateScene({ mediaWidth: 180, mediaHeight: 320 })}>9:16 (Portrait)</button>
                <button className="btn btn-secondary" style={{ flex: 1, fontSize: 10, padding: '4px 0' }} onClick={() => updateScene({ mediaWidth: 250, mediaHeight: 250 })}>1:1 (Square)</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Scale Size</label>
                <input
                  type="range"
                  min="0.5" max="2" step="0.1"
                  value={activeScene.mediaScale ?? 1.0}
                  onChange={(e) => updateScene({ mediaScale: parseFloat(e.target.value) })}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{activeScene.mediaScale ?? 1.0}x</span>
              </div>


              <h4 style={{ fontSize: 13, fontWeight: 600, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16, marginBottom: 12 }}>Camera Setup</h4>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Position the camera in the 3D view, then save the angle for this scene. Or use a quick preset below:</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 0', fontSize: 11 }}
                  onClick={() => {
                    const isPortrait = aspectRatio === '9:16';
                    const hasMedia = !!activeScene.mediaUrl;
                    const xOffset = hasMedia ? (isPortrait ? 0 : 0.6) : 0;
                    const yPos = isPortrait && hasMedia ? -2.3 : -2;
                    const yTarget = isPortrait && hasMedia ? -2.3 : -2.3;
                    updateScene({ cameraPosition: [xOffset, yPos, 3.5], cameraTarget: [xOffset, yTarget, 0] });
                  }}
                >
                  <IconCamera size={14} style={{ marginRight: 4 }} /> Full Body
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 0', fontSize: 11 }}
                  onClick={() => {
                    const isPortrait = aspectRatio === '9:16';
                    const hasMedia = !!activeScene.mediaUrl;
                    const xOffset = hasMedia ? (isPortrait ? 0 : 0.5) : 0;
                    const yPos = isPortrait && hasMedia ? -2 : -1.8;
                    const yTarget = isPortrait && hasMedia ? -2 : -1.8;
                    updateScene({ cameraPosition: [xOffset, yPos, 2.0], cameraTarget: [xOffset, yTarget, 0] });
                  }}
                >
                  <IconCamera size={14} style={{ marginRight: 4 }} /> Half Body
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 0', fontSize: 11 }}
                  onClick={() => {
                    const isPortrait = aspectRatio === '9:16';
                    const hasMedia = !!activeScene.mediaUrl;
                    const xOffset = hasMedia ? (isPortrait ? 0 : 0.3) : 0;
                    const yPos = isPortrait && hasMedia ? -1.8 : -2.0;
                    const yTarget = isPortrait && hasMedia ? -1.8 : -2.0;
                    updateScene({ cameraPosition: [xOffset, yPos, 1.0], cameraTarget: [xOffset, yTarget, 0] });
                  }}
                >
                  <IconCamera size={14} style={{ marginRight: 4 }} /> Close-up
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 0', fontSize: 11 }}
                  onClick={() => {
                    const isPortrait = aspectRatio === '9:16';
                    const hasMedia = !!activeScene.mediaUrl;
                    const xOffset = hasMedia ? (isPortrait ? 0 : 0.6) : 0;
                    const camX = isPortrait ? xOffset + 0.6 : xOffset + 1.0;
                    const yPos = isPortrait && hasMedia ? -1.8 : -2.0;
                    const yTarget = isPortrait && hasMedia ? -1.8 : -2.3;
                    updateScene({ cameraPosition: [camX, yPos, 1.5], cameraTarget: [xOffset, yTarget, 0] });
                  }}
                >
                  <IconCamera size={14} style={{ marginRight: 4 }} /> Side Angle
                </button>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', marginBottom: 12 }} onClick={takeSnapshot}>
                <IconCamera size={16} /> Save Current Angle & Snapshot
              </button>

              <div style={{ marginTop: 32, padding: 16, background: 'rgba(108, 92, 231, 0.1)', borderRadius: 8, border: '1px solid rgba(108, 92, 231, 0.2)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: 'var(--accent)' }}>Avatar Configuration</h4>

                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginTop: 8, marginBottom: 4 }}>Avatar GLB URL</label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px 8px', color: 'white', fontSize: 11 }}
                  placeholder="URL (empty for Robot)"
                />

                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginTop: 12, marginBottom: 4 }}>Voice</label>
                <select
                  value={voice?.voiceURI || ''}
                  onChange={e => {
                    const selected = availableVoices.find(v => v.voiceURI === e.target.value);
                    if (selected) setVoice(selected);
                  }}
                  style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px 8px', color: 'white', fontSize: 11 }}
                >
                  {availableVoices.map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          {/* 3D Canvas Area */}
          <main className="studio-canvas-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
            <div style={{
              width: aspectRatio === '16:9' ? '100%' : 'auto',
              height: aspectRatio === '16:9' ? 'auto' : '100%',
              aspectRatio: aspectRatio === '16:9' ? '16/9' : '9/16',
              position: 'relative',
              maxHeight: '100%',
              maxWidth: '100%',
              overflow: 'hidden',
              boxShadow: '0 0 20px rgba(0,0,0,0.5)'
            }}>
              <LoaderOverlay />
              <Canvas id="main-webgl-canvas" camera={{ position: [0, 0, 4], fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
                <Suspense fallback={null}>
                  <SceneBackground />
                </Suspense>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
                <directionalLight position={[-10, 10, -5]} intensity={0.5} />
                <Environment preset="city" />

                <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
                  <CustomAvatar url={avatarUrl} speaking={isSpeaking} gesture={activeScene.gesture} isMoving={activeScene.isMoving} aspectRatio={aspectRatio} />
                </Float>

                <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={10} blur={2} />
                <Sparkles count={50} scale={4} size={2} speed={0.4} opacity={0.2} color="var(--accent)" />


                <CameraTracker activeScene={activeScene} />
              </Canvas>

              {/* Fixed UI Overlay */}
              <MediaOverlay
                url={activeScene.mediaUrl}
                scale={activeScene.mediaScale}
                width={activeScene.mediaWidth}
                height={activeScene.mediaHeight}
                aspectRatio={aspectRatio}
              />

              {/* Playback overlay */}
              {playingIndex >= 0 && (
                <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', padding: '12px 24px', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--accent)' }}>
                  <div className="typing-indicator" style={{ display: 'flex', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6c5ce7', animation: 'bounce 1s infinite' }} />
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6c5ce7', animation: 'bounce 1s infinite 0.2s' }} />
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6c5ce7', animation: 'bounce 1s infinite 0.4s' }} />
                  </div>
                  <strong style={{ fontSize: 14, color: 'white' }}>Playing: {scenes[playingIndex]?.title}</strong>
                </div>
              )}

              {/* Converting Overlay */}
              {isConverting && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                  <div style={{ width: 40, height: 40, border: '4px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <h3 style={{ marginTop: 16, color: 'white' }}>Converting to MP4...</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Transcoding Opus audio to AAC</p>
                </div>
              )}
            </div>
          </main>

          {/* Timeline Sidebar */}
          <aside className="studio-timeline-sidebar">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Scenes ({scenes.length})</h3>
              <button onClick={addScene} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>
                <IconPlus size={18} />
              </button>
            </div>
            <div style={{ padding: 12, flex: 1, overflowY: 'auto' }}>
              {scenes.map((s, index) => (
                <div
                  key={s.id}
                  onClick={() => setActiveSceneId(s.id)}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    borderRadius: 8,
                    background: activeSceneId === s.id ? 'var(--bg-glass-strong)' : 'var(--bg-glass)',
                    border: `1px solid ${activeSceneId === s.id ? 'var(--accent)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong style={{ fontSize: 13 }}>{s.title}</strong>
                    {scenes.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); deleteScene(s.id); }} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: 0 }}>
                        <IconTrash size={14} />
                      </button>
                    )}
                  </div>
                  {s.snapshotUrl ? (
                    <img src={s.snapshotUrl} alt="Snapshot" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4 }} />
                  ) : (
                    <div style={{ width: '100%', height: 80, background: 'rgba(0,0,0,0.3)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                      No snapshot
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.script || 'No script'}
                  </div>
                </div>
              ))}
            </div>
          </aside>

        </div>
      </div>
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, background: 'var(--accent)', color: 'white', padding: '12px 24px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 9999, fontWeight: 600, animation: 'slideIn 0.3s ease-out' }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

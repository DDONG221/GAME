import React, { useState, useEffect, useRef } from 'react';
import { network } from './network';
import { GameRole, Player, Enemy, GameState, GameMessage } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, Shield, AlertTriangle, Users, Play, Zap, 
  ShieldAlert, RefreshCw, Volume2, VolumeX, Info, ListFilter,
  Award, Wifi, WifiOff, Send, HelpCircle, Swords, CheckCircle2
} from 'lucide-react';

// 시스템 해킹/AI 테마 단어 풀
const WORD_POOL = [
  'const', 'let', 'function', 'import', 'export', 'return', 'async', 'await', 'promise', 'fetch',
  'interface', 'component', 'useState', 'useEffect', 'typeof', 'instanceof', 'prototype', 'constructor',
  'hacker', 'firewall', 'database', 'cybersecurity', 'malware', 'injection', 'encryption', 'decryption',
  'payload', 'algorithm', 'compiler', 'vulnerability', 'backdoor', 'ransomware', 'phishing', 'protocol',
  'binary', 'hexadecimal', 'repository', 'deployment', 'framework', 'javascript', 'typescript', 'react',
  'kubernetes', 'docker', 'dockerfile', 'microservice', 'cloudrun', 'ai-studio', 'gemini', 'openai',
  'neural-network', 'deep-learning', 'sandbox', 'token', 'session', 'endpoint', 'cors', 'headers',
  'middleware', 'authentication', 'authorization', 'websocket', 'peerjs', 'webrtc', 'localhost', 'nginx',
  'serverless', 'graphql', 'sql-injection', 'buffer-overflow', 'zero-day', 'brute-force', 'spoofing',
  'man-in-the-middle', 'rootkit', 'spyware', 'trojan', 'keylogger', 'botnet', 'ddos', 'antivirus'
];

// 화려한 텍스트 파티클 이펙트용 타입
interface Explosion {
  id: string;
  text: string;
  x: number;
  y: number;
}

export default function App() {
  const [role, setRole] = useState<GameRole>(null);
  const [myId, setMyId] = useState<string>('');
  const [hostIdInput, setHostIdInput] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isGameOver: false,
    score: 0,
    wave: 1,
    hp: 100,
    enemies: []
  });

  const [typedWord, setTypedWord] = useState<string>('');
  const [skillCooldown, setSkillCooldown] = useState<boolean>(false);
  const [skillTimeLeft, setSkillTimeLeft] = useState<number>(0);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [empActive, setEmpActive] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [shakeScreen, setShakeScreen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  const gameStateRef = useRef<GameState>(gameState);
  const playersRef = useRef<Player[]>(players);
  const gameIntervalRef = useRef<number | null>(null);
  const spawnIntervalRef = useRef<number | null>(null);
  const nextEnemyIdRef = useRef<number>(1);

  // 사운드 피드백 (Web Audio API를 직접 이용해 외부 리소스 없이 신스 효과음 연출)
  const playSynthSound = (type: 'shoot' | 'explode' | 'emp' | 'damage' | 'gameover' | 'waveup') => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      switch (type) {
        case 'shoot': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
          break;
        }
        case 'explode': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.25);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
          break;
        }
        case 'emp': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(80, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.6);
          break;
        }
        case 'damage': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(120, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(30, ctx.currentTime + 0.25);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
          break;
        }
        case 'waveup': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(300, ctx.currentTime);
          osc.frequency.setValueAtTime(450, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(600, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.4);
          break;
        }
        case 'gameover': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.8);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.92);
          break;
        }
      }
    } catch (e) {
      console.warn('AudioContext failed to start (interaction limit):', e);
    }
  };

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // EMP 쿨다운 타이머 핸들링
  useEffect(() => {
    if (skillCooldown) {
      const interval = setInterval(() => {
        setSkillTimeLeft(prev => {
          if (prev <= 1) {
            setSkillCooldown(false);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [skillCooldown]);

  const triggerScreenShake = () => {
    setShakeScreen(true);
    setTimeout(() => setShakeScreen(false), 300);
  };

  const handleNetworkMessage = (senderId: string, message: GameMessage) => {
    switch (message.type) {
      case 'PLAYER_JOIN':
        if (role === 'HOST') {
          const newPlayer: Player = {
            id: senderId,
            name: message.payload.name || '알 수 없는 해커',
            score: 0,
            isReady: false
          };
          const updatedPlayers = [...playersRef.current, newPlayer];
          setPlayers(updatedPlayers);
          network.broadcast({ type: 'SYNC_PLAYERS', payload: updatedPlayers });
        }
        break;

      case 'PLAYER_LEAVE':
        if (role === 'HOST') {
          const updatedPlayers = playersRef.current.filter(p => p.id !== senderId);
          setPlayers(updatedPlayers);
          network.broadcast({ type: 'SYNC_PLAYERS', payload: updatedPlayers });
        }
        break;

      case 'SYNC_PLAYERS':
        setPlayers(message.payload);
        break;

      case 'START_GAME':
        startGameLogic();
        break;

      case 'SYNC_GAME':
        if (role === 'CLIENT') {
          setGameState(message.payload);
        }
        break;

      case 'SUBMIT_WORD':
        if (role === 'HOST') {
          processWordSubmission(senderId, message.payload.word);
        }
        break;

      case 'GAME_OVER_TRIGGER':
        setGameState(prev => ({ ...prev, isPlaying: false, isGameOver: true }));
        playSynthSound('gameover');
        if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
        if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
        break;

      case 'USE_SKILL':
        if (role === 'HOST') {
          triggerEMPBlastLogic();
        }
        break;
    }
  };

  const handleDisconnect = (id: string) => {
    if (role === 'HOST') {
      const updatedPlayers = playersRef.current.filter(p => p.id !== id);
      setPlayers(updatedPlayers);
      network.broadcast({ type: 'SYNC_PLAYERS', payload: updatedPlayers });
    } else if (role === 'CLIENT' && id === hostIdInput) {
      setErrorMsg('호스트 서버와의 연결이 끊어졌습니다.');
      resetToLobby();
    }
  };

  // 1인 플레이어 모드 기동
  const initSinglePlayer = () => {
    const name = playerName.trim() || '해커_로컬';
    setPlayerName(name);
    setRole('SINGLE');
    setMyId('LOCAL_NODE');
    setPlayers([{ id: 'LOCAL_NODE', name, score: 0, isReady: true }]);
    setConnectionStatus('오프라인 로컬 보안 샌드박스 작동 중');
  };

  // 호스트 서버 초기화
  const initHost = () => {
    const name = playerName.trim() || '해커_호스트';
    setPlayerName(name);
    setConnectionStatus('호스트 인증 터널 개설 중...');
    setErrorMsg('');
    
    network.initialize(
      (id) => {
        setMyId(id);
        setRole('HOST');
        setPlayers([{ id, name, score: 0, isReady: true }]);
        setConnectionStatus('호스트 룸 개설 완료 (WebRTC 활성)');
      },
      (err) => {
        setErrorMsg('PeerJS 서버를 초기화할 수 없습니다. 오프라인 모드로 플레이 하거나 메인 네트워크 상태를 점검하십시오.');
        setConnectionStatus('인증 실패');
      }
    );
    network.onMessage(handleNetworkMessage);
    network.onDisconnect(handleDisconnect);
  };

  // 클라이언트 접속 시동
  const initClient = () => {
    const name = playerName.trim() || '해커_원격';
    if (!hostIdInput.trim()) {
      alert('접속하려는 호스트의 Peer ID 코드를 입력해야 합니다.');
      return;
    }
    setPlayerName(name);
    setConnectionStatus('서버 네트워크 프록시 매칭 중...');
    setErrorMsg('');
    
    network.initialize(
      (id) => {
        setMyId(id);
        network.connectToHost(
          hostIdInput.trim(),
          () => {
            setRole('CLIENT');
            setConnectionStatus('연합망 접속 성공! 해킹 작전 대기 중');
            network.send(hostIdInput.trim(), { type: 'PLAYER_JOIN', payload: { name } });
          },
          (err) => {
            setErrorMsg('호스트에 연결할 수 없습니다. 호스트 ID가 유효한지 또는 방화벽 규칙을 검토해 주십시오.');
            setConnectionStatus('동기화 실패');
          }
        );
      },
      (err) => {
        setErrorMsg('로컬 네트워크 드라이버 연결에 실패했습니다.');
        setConnectionStatus('인증 터널 불안정');
      }
    );
    network.onMessage(handleNetworkMessage);
    network.onDisconnect(handleDisconnect);
  };

  const startGameLogic = () => {
    setGameState({ isPlaying: true, isGameOver: false, score: 0, wave: 1, hp: 100, enemies: [] });
    setTypedWord('');
    setExplosions([]);

    if (role === 'HOST' || role === 'SINGLE') {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);

      gameIntervalRef.current = window.setInterval(() => { updateEnemiesPhysics(); }, 50);
      spawnIntervalRef.current = window.setInterval(() => { spawnEnemyLogic(); }, 2200);
    }
  };

  const hostTriggerStart = () => {
    if (role === 'CLIENT') return;
    if (role === 'HOST') {
      network.broadcast({ type: 'START_GAME', payload: null });
    }
    startGameLogic();
  };

  const spawnEnemyLogic = () => {
    const currentGameState = gameStateRef.current;
    const currentPlayers = playersRef.current;
    if (!currentGameState.isPlaying || currentPlayers.length === 0) return;

    // 더 어려운 단어 풀에서 웨이브에 부합하는 적 단어 선택
    const selectWordByWave = (wave: number) => {
      let filtered = WORD_POOL;
      if (wave === 1) {
        filtered = WORD_POOL.filter(w => w.length <= 6);
      } else if (wave === 2) {
        filtered = WORD_POOL.filter(w => w.length <= 9);
      } else {
        filtered = WORD_POOL;
      }
      return filtered[Math.floor(Math.random() * filtered.length)];
    };

    const randomWord = selectWordByWave(currentGameState.wave);
    const randomPlayer = currentPlayers[Math.floor(Math.random() * currentPlayers.length)];
    
    // speed scale based on wave
    const baseSpeed = 1.0 + (currentGameState.wave * 0.25);
    const speedVariation = Math.random() * 0.8;
    
    const newEnemy: Enemy = {
      id: `enemy-${Date.now()}-${nextEnemyIdRef.current++}`,
      text: randomWord,
      x: Math.floor(Math.random() * 70) + 15, // 15%~85% bounds to prevent clipping
      y: 0,
      speed: baseSpeed + speedVariation,
      targetPlayerId: randomPlayer.id
    };

    setGameState(prev => {
      const nextState = { ...prev, enemies: [...prev.enemies, newEnemy] };
      if (role === 'HOST') {
        network.broadcast({ type: 'SYNC_GAME', payload: nextState });
      }
      return nextState;
    });
  };

  const updateEnemiesPhysics = () => {
    setGameState(prev => {
      let hpDamage = 0;
      let missedEnemiesCount = 0;

      const updatedEnemies = prev.enemies.map(enemy => {
        return { ...enemy, y: enemy.y + enemy.speed };
      }).filter(enemy => {
        // 450px threshold (the "penetration threshold" zone)
        if (enemy.y >= 450) {
          hpDamage += 12;
          missedEnemiesCount++;
          return false;
        }
        return true;
      });

      if (missedEnemiesCount > 0) {
        playSynthSound('damage');
        triggerScreenShake();
      }

      const nextHp = Math.max(0, prev.hp - hpDamage);
      const isOver = nextHp <= 0;
      // 250점 단위로 웨이브 상승
      const calculatedWave = Math.floor(prev.score / 250) + 1;
      const originalWave = prev.wave;
      
      const nextState = {
        ...prev,
        hp: nextHp,
        enemies: updatedEnemies,
        wave: calculatedWave > originalWave ? calculatedWave : originalWave,
        isPlaying: !isOver,
        isGameOver: isOver
      };

      if (calculatedWave > originalWave) {
        playSynthSound('waveup');
      }

      if (isOver && prev.isPlaying) {
        setExplosions([]);
        playSynthSound('gameover');
        if (role === 'HOST') {
          network.broadcast({ type: 'GAME_OVER_TRIGGER', payload: null });
        }
        if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
        if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      } else if (role === 'HOST') {
        network.broadcast({ type: 'SYNC_GAME', payload: nextState });
      }

      return nextState;
    });
  };

  const processWordSubmission = (playerId: string, word: string) => {
    setGameState(prev => {
      const targetEnemyIndex = prev.enemies.findIndex(e => e.text.toLowerCase() === word.trim().toLowerCase());
      
      if (targetEnemyIndex !== -1) {
        const matchedEnemy = prev.enemies[targetEnemyIndex];
        const updatedEnemies = [...prev.enemies];
        updatedEnemies.splice(targetEnemyIndex, 1);

        // 점수 획득 시 시각적인 폭발(소멸) 위치 기록
        const newExplosion: Explosion = {
          id: Math.random().toString(),
          text: `+20 ${matchedEnemy.text}`,
          x: matchedEnemy.x,
          y: matchedEnemy.y
        };
        setExplosions(old => [...old.slice(-5), newExplosion]); // 최대 6개까지 보존
        setTimeout(() => {
          setExplosions(old => old.filter(ex => ex.id !== newExplosion.id));
        }, 1500);

        playSynthSound('explode');

        // 플레이어 해커의 점수 증가
        const updatedPlayers = playersRef.current.map(p => {
          if (p.id === playerId) return { ...p, score: p.score + 20 };
          return p;
        });
        setPlayers(updatedPlayers);
        
        if (role === 'HOST') {
          network.broadcast({ type: 'SYNC_PLAYERS', payload: updatedPlayers });
        }

        const nextState = { ...prev, score: prev.score + 20, enemies: updatedEnemies };
        if (role === 'HOST') {
          network.broadcast({ type: 'SYNC_GAME', payload: nextState });
        }
        return nextState;
      }
      return prev;
    });
  };

  const triggerEMPBlastLogic = () => {
    playSynthSound('emp');
    setEmpActive(true);
    triggerScreenShake();
    setTimeout(() => setEmpActive(false), 800);

    setGameState(prev => {
      // 화면에 있는 모든 적 단어 제거하여 점수 및 해제
      const clearedCount = prev.enemies.length;
      const additionalScore = clearedCount * 10;
      
      const newExplosions = prev.enemies.map(e => ({
        id: Math.random().toString(),
        text: `EMP SHOCKWAVE`,
        x: e.x,
        y: e.y
      }));
      setExplosions(old => [...old, ...newExplosions]);
      setTimeout(() => {
        setExplosions(old => old.filter(ex => !newExplosions.find(ne => ne.id === ex.id)));
      }, 1500);

      const nextState = {
        ...prev,
        enemies: [],
        score: prev.score + additionalScore
      };

      if (role === 'HOST') {
        network.broadcast({ type: 'SYNC_GAME', payload: nextState });
      }
      return nextState;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (!typedWord.trim() || !gameState.isPlaying) return;
      playSynthSound('shoot');

      if (role === 'SINGLE' || role === 'HOST') {
        processWordSubmission(myId, typedWord.trim());
      } else if (role === 'CLIENT') {
        network.send(hostIdInput, { type: 'SUBMIT_WORD', payload: { word: typedWord.trim() } });
      }
      setTypedWord('');
    }
  };

  // EMP 웨이브 스킬 발사
  const useEMPBlast = () => {
    if (skillCooldown || !gameState.isPlaying) return;
    setSkillCooldown(true);
    setSkillTimeLeft(15); // 15초 쿨타운

    if (role === 'SINGLE' || role === 'HOST') {
      triggerEMPBlastLogic();
    } else if (role === 'CLIENT') {
      network.send(hostIdInput, { type: 'USE_SKILL', payload: null });
    }
  };

  const resetToLobby = () => {
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    network.disconnect();
    setRole(null);
    setGameState({ isPlaying: false, isGameOver: false, score: 0, wave: 1, hp: 100, enemies: [] });
    setPlayers([]);
    setConnectionStatus('');
    setTypedWord('');
    setExplosions([]);
  };

  const copyHostIdToClipboard = () => {
    if (!myId) return;
    navigator.clipboard.writeText(myId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // 타이핑하고 있는 단어와 가장 매칭도가 높은 화면의 적 단어를 식별하는 헬퍼함수
  const checkInputMatching = (enemyText: string): { matched: string; unmatched: string } => {
    if (!typedWord.trim()) return { matched: '', unmatched: enemyText };
    const query = typedWord.trim().toLowerCase();
    const target = enemyText.toLowerCase();

    if (target.startsWith(query)) {
      return {
        matched: enemyText.substring(0, query.length),
        unmatched: enemyText.substring(query.length)
      };
    }
    return { matched: '', unmatched: enemyText };
  };

  return (
    <div className="min-h-screen bg-black text-green-400 p-4 font-mono flex flex-col justify-between selection:bg-green-900 selection:text-white">
      {/* HEADER SECTION */}
      <header className="border-b border-green-900/60 pb-3 flex flex-col sm:flex-row justify-between items-center bg-zinc-950 p-4 rounded-t-md gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Terminal className="text-green-500 animate-pulse w-7 h-7" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black tracking-widest text-green-300 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]">
              HACKER <span className="text-zinc-500 font-light">vs</span> AI
            </h1>
            <p className="text-[10px] text-green-600 tracking-wider">SECURE CONSOLE WORD DEFENSE SYSTEM v1.4.2</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className="p-1 px-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-xs flex items-center gap-1.5 text-zinc-400 transition"
            title={isMuted ? '음소거 해제' : '음소거'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
            <span className="hidden sm:inline">{isMuted ? 'MUTE ON' : 'SOUND ON'}</span>
          </button>
          
          <div className="text-xs text-green-500 bg-black/80 px-3 py-1.5 border border-green-950 rounded flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${role ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${role ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
            <span className="font-semibold">{connectionStatus || '임시 단말망 격리됨'}</span>
          </div>
        </div>
      </header>

      {/* ERROR DISPLAY */}
      {errorMsg && (
        <div className="my-2 bg-red-950/40 border border-red-900/60 text-red-400 text-xs px-4 py-3 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 animate-bounce shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-[10px] text-red-500 underline font-bold hover:text-red-300">소거</button>
        </div>
      )}

      {/* MAIN GAME INTERACTIVE SECTION */}
      <main className="flex-1 my-4 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden">
        
        {/* SIDEBAR: CONNECTION CONTROLLER & PLAYERS */}
        <div className="md:col-span-1 bg-zinc-950 border border-zinc-900 p-4 rounded-md flex flex-col justify-between space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {!role ? (
            <div className="space-y-4">
              <div className="border border-green-950/70 p-4 rounded bg-black/60 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-xl group-hover:bg-green-500/10 transition-colors pointer-events-none" />
                <h2 className="text-xs font-bold text-green-300 mb-3 flex items-center gap-2 tracking-widest">
                  <Shield className="w-4 h-4 text-green-500" /> 01. 커맨더 신원 등록
                </h2>
                <label className="block text-[10px] text-green-700 font-bold uppercase mb-1">HACKER CODE SIGNATURE</label>
                <input 
                  type="text" 
                  placeholder="접속 해커명 입력 (e.g. Neo)" 
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-green-400 placeholder-green-800 text-sm focus:outline-none focus:border-green-500 transition-colors font-bold"
                />
              </div>

              <div className="space-y-3">
                <div className="border border-blue-950/70 p-4 rounded bg-black/60 relative overflow-hidden group">
                  <h3 className="text-xs font-bold text-blue-400 mb-1 tracking-widest">02. 싱글 플레이 모드</h3>
                  <p className="text-[10px] text-zinc-500 mb-3 font-semibold">동작 중인 가상 AI 방화벽을 격리 상태에서 훈련 해킹합니다.</p>
                  <button 
                    onClick={initSinglePlayer} 
                    className="w-full bg-gradient-to-r from-teal-900 to-emerald-900 hover:from-teal-800 hover:to-emerald-800 border border-emerald-700 text-white font-bold py-2 px-3 rounded transition-all text-xs active:scale-[0.98] cursor-pointer"
                  >
                    오프라인 훈련 시작
                  </button>
                </div>

                <div className="border border-green-950/70 p-4 rounded bg-black/60 space-y-3">
                  <h3 className="text-xs font-bold text-green-400 tracking-widest">03. 협동 플레이어 세션</h3>
                  <p className="text-[10px] text-zinc-500 font-semibold">루트 호스트를 가동하여 연합 통신망을 개설합니다.</p>
                  <button 
                    onClick={initHost} 
                    className="w-full bg-zinc-900 hover:bg-zinc-850 border border-green-800 text-green-300 font-bold py-2 px-3 rounded transition-all text-xs active:scale-[0.98] cursor-pointer"
                  >
                    새로운 호스트 터널 오픈
                  </button>

                  <div className="pt-2 border-t border-zinc-900 space-y-2">
                    <p className="text-[10px] text-zinc-500 font-semibold">이미 개설된 호스트 ID를 통해 타겟 연합망에 접속합니다.</p>
                    <input 
                      type="text" 
                      placeholder="수신된 호스트 PEER ID 입력" 
                      value={hostIdInput} 
                      onChange={(e) => setHostIdInput(e.target.value)} 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-blue-400 placeholder-zinc-700 text-xs focus:outline-none focus:border-blue-600 font-mono" 
                    />
                    <button 
                      onClick={initClient} 
                      className="w-full bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-300 font-bold py-2 px-3 rounded transition-all text-xs active:scale-[0.98] cursor-pointer"
                    >
                      해킹 세션 침투하기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between h-full">
              <div className="space-y-4">
                {role !== 'SINGLE' && (
                  <div className="bg-black p-3 border border-zinc-900 rounded text-xs relative">
                    <span className="absolute top-1 right-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-400">
                      Webrtc P2P
                    </span>
                    <p className="text-zinc-600 font-bold uppercase tracking-wider text-[9px]">네트워크 통신 Node ID</p>
                    <div className="mt-1 flex gap-2 items-center">
                      <p className="text-yellow-500 select-all font-mono font-bold break-all flex-1 bg-zinc-950 px-2 py-1 rounded border border-zinc-900">{myId || '통신 대기 중...'}</p>
                      <button 
                        onClick={copyHostIdToClipboard} 
                        className="px-2 py-1.5 bg-zinc-900 hover:bg-zinc-805 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded text-[10px] transition cursor-pointer"
                        title="ID 복사"
                      >
                        {copiedId ? 'Copy!' : '복사'}
                      </button>
                    </div>
                    <p className="text-[8px] text-zinc-500 mt-1 font-semibold">망에 접속할 동료 해커에게 상단의 ID를 공유하세요.</p>
                  </div>
                )}

                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-green-300 flex items-center justify-between border-b border-green-950 pb-1.5 tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-green-500" /> 연합망 해커 요원
                    </span>
                    <span className="bg-green-950 text-green-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{players.length} NODE</span>
                  </h3>
                  
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {players.map((p) => {
                      const isMe = p.id === myId;
                      return (
                        <div 
                          key={p.id} 
                          className={`flex justify-between items-center text-xs p-2.5 rounded transition ${
                            isMe ? 'bg-green-950/20 border border-green-900/40' : 'bg-zinc-950 border border-zinc-900'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${isMe ? 'bg-yellow-400 animate-ping' : 'bg-green-500'}`} />
                            <span className={`font-bold ${isMe ? 'text-yellow-400' : 'text-zinc-300'}`}>
                              {p.name} {isMe && <span className="text-[8px] text-yellow-600 font-bold">(지휘부)</span>}
                            </span>
                          </div>
                          <span className="text-green-400 font-mono font-black">{p.score} <span className="text-[9px] text-green-700">PTS</span></span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900">
                {role === 'CLIENT' && !gameState.isPlaying && (
                  <div className="text-center p-3 border border-yellow-950 bg-yellow-950/10 rounded mb-3">
                    <p className="text-[10px] text-yellow-500 font-bold animate-pulse">호스트가 보안 해킹 세션을 트리거링하길 대기 중...</p>
                  </div>
                )}
                
                {role !== 'CLIENT' && !gameState.isPlaying && (
                  <button 
                    onClick={hostTriggerStart} 
                    className="w-full bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 font-bold py-3 px-4 rounded flex items-center justify-center gap-2 animate-pulse hover:shadow-[0_0_12px_rgba(239,68,68,0.3)] transition cursor-pointer text-sm tracking-widest"
                  >
                    <Play className="w-4 h-4 fill-current text-red-400" /> {gameState.isGameOver ? '메인서버 재침투 가동' : '백도어 실행 (시작)'}
                  </button>
                )}
                
                <button 
                  onClick={resetToLobby} 
                  className="w-full mt-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-500 hover:text-zinc-400 py-1.5 px-3 border border-zinc-800 rounded text-xs transition active:scale-[0.98] cursor-pointer"
                >
                  기지 철수 (연결 해제)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SCREEN SECTION (CANVAS GAME STAGE) */}
        <div 
          className={`md:col-span-3 bg-black border border-zinc-900 rounded-md relative flex flex-col overflow-hidden h-[560px] shadow-[inset_0_0_30px_rgba(0,0,0,0.9)] transition-all duration-100 ${
            shakeScreen ? 'translate-x-1 translate-y-1' : ''
          }`}
        >
          {/* LOBBY / IDLE SCREEN */}
          {!gameState.isPlaying && !gameState.isGameOver ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-black via-zinc-950 to-black relative">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#022c15_1px,transparent_1px),linear-gradient(to_bottom,#022c15_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_80%)] opacity-30 pointer-events-none"></div>
              
              <div className="p-4 bg-green-950/20 rounded-full border border-green-900/40 mb-5 relative">
                <ShieldAlert className="w-14 h-14 text-green-400 animate-pulse" />
                <div className="absolute top-0 left-0 right-0 bottom-0 border border-green-500/20 rounded-full animate-ping [animation-duration:3s]" />
              </div>
              
              <h2 className="text-xl sm:text-3xl font-black text-green-300 tracking-widest mb-3 uppercase">
                AI 방화벽 단어 요격 디펜스
              </h2>
              <p className="text-xs text-zinc-500 max-w-lg leading-relaxed mb-6 font-semibold">
                원치 않은 AI 중앙 제어 시스템이 작동을 개시했습니다. 상단에서 쏟아지는 주황색/녹색 보안 소스코드(단어)들을 정확하게 타이핑하여 요격하십시오. P2P direct 연결망을 통해 연합군을 구성하면, 방화벽 단어가 서로 골고루 침투되도록 요격 전담 파트가 지정됩니다. 연합군과 힘을 합치고 EMP 특수 공격을 활용해 보세요!
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-sm w-full bg-zinc-950/70 p-4 rounded border border-zinc-900 text-left">
                <div>
                  <h4 className="text-[10px] text-green-600 font-bold uppercase tracking-wider">특수 EMP 공격</h4>
                  <p className="text-[9px] text-zinc-500">모든 위험 소스코드를 소거할 수 있으며, 15초의 쿨다운을 거칩니다.</p>
                </div>
                <div>
                  <h4 className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">전담 타겟 마킹</h4>
                  <p className="text-[9px] text-zinc-500">멀티 플레이어 시, 타겟 마킹이 붙은 단어들은 내가 전담 요격 해야 안정적인 시너지를 낼 수 있습니다.</p>
                </div>
              </div>
            </div>
          ) : gameState.isGameOver ? (
            /* GAME OVER SCREEN */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-zinc-950 relative">
              <div className="absolute inset-0 bg-red-950/5 pointer-events-none" />
              
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center"
              >
                <AlertTriangle className="w-20 h-20 text-red-500 mb-5 animate-bounce" />
                <h2 className="text-3xl sm:text-4xl font-black text-red-500 tracking-wider mb-2 uppercase select-text">
                  MAINFRAME TERMINATED
                </h2>
                <p className="text-xs text-zinc-500 max-w-md mb-6 font-semibold">
                  중앙 코어 메모리가 누출되어 AI 방화벽에 제어권이 완전 탈취당했습니다.
                </p>

                <div className="bg-black/90 border border-red-950/80 p-5 rounded-md w-full max-w-xs mb-6 shadow-2xl">
                  <div className="text-[10px] text-zinc-500 font-bold mb-1 uppercase tracking-widest">COOP TOTAL FINALIZE SCORE</div>
                  <div className="text-3xl font-mono text-yellow-500 font-black">{gameState.score} <span className="text-xs text-zinc-600 font-normal">PTS</span></div>
                  <div className="text-[10px] text-emerald-500 font-black mt-2 tracking-widest">수비 성공 웨이브: WAVE {gameState.wave}</div>
                </div>

                {role !== 'CLIENT' && (
                  <button 
                    onClick={hostTriggerStart} 
                    className="bg-gradient-to-r from-green-900 to-emerald-900 hover:from-green-800 hover:to-emerald-800 border border-emerald-700 text-white font-bold py-2.5 px-6 rounded text-sm transition-all focus:outline-none focus:ring-1 focus:ring-green-400 active:scale-95 cursor-pointer"
                  >
                    서버 상태 리부트 (다시 도전)
                  </button>
                )}
              </motion.div>
            </div>
          ) : (
            /* ACTIVE GAME SCREEN */
            <div className="flex-1 flex flex-col justify-between bg-zinc-950 relative overflow-hidden">
              
              {/* EMP BLAST EFFECT OVERLAY */}
              <AnimatePresence>
                {empActive && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.8, scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 bg-yellow-500/25 blur-3xl rounded-full z-20 pointer-events-none flex items-center justify-center"
                  >
                    <div className="text-yellow-400 font-black tracking-widest text-3xl opacity-80 uppercase rotate-6">EMP EMERGENCY SHOCKWAVE ACTIVE</div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* STATS PANEL BAR */}
              <div className="bg-black/90 border-b border-zinc-900 px-4 py-2 flex justify-between items-center text-xs z-10 shadow-md">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500">방화벽 레벨:</span>
                    <span className="text-yellow-400 font-black tracking-widest bg-yellow-950/40 px-2 py-0.5 rounded border border-yellow-900/30">WAVE {gameState.wave}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500">누적 점수:</span>
                    <span className="text-green-400 font-black bg-green-950/40 px-2 py-0.5 rounded border border-green-900/30">{gameState.score} PTS</span>
                  </div>
                </div>
                
                {/* COOPERATING MAINFRAME HEALTH BAR */}
                <div className="flex items-center gap-3 w-2/5 max-w-xs">
                  <span className="text-red-400 font-black text-[9px] tracking-wider uppercase shrink-0">CORE MEMORY</span>
                  <div className="flex-1 bg-zinc-900 h-3 border border-red-950/40 rounded overflow-hidden relative shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        gameState.hp <= 30 
                          ? 'bg-gradient-to-r from-red-700 to-red-500 animate-pulse' 
                          : gameState.hp <= 60 
                          ? 'bg-gradient-to-r from-amber-600 to-amber-500' 
                          : 'bg-gradient-to-r from-emerald-600 to-green-500'
                      }`}
                      style={{ width: `${gameState.hp}%` }} 
                    />
                  </div>
                  <span className="text-red-400 font-mono text-[10px] w-5 text-right font-black">{gameState.hp}</span>
                </div>
              </div>

              {/* CANVAS ZONE (WHERE WORDS FALL) */}
              <div className="flex-1 w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-neutral-950 to-black relative">
                
                {/* DECORATIVE GRID */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#032211_1px,transparent_1px),linear-gradient(to_bottom,#032211_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-25 pointer-events-none" />

                {/* THRESHOLD BOUNDS LINE */}
                <div className="absolute top-[450px] left-0 right-0 border-t border-dashed border-red-900/60 flex justify-center z-0 pointer-events-none">
                  <span className="bg-black/90 border border-red-950/30 px-3 text-[8px] text-red-500 font-black tracking-widest -mt-2 uppercase rounded-md shadow-lg">
                    🔒 AI MEMORY INTRUSION THRESHOLD
                  </span>
                </div>

                {/* FALLING ENEMY WORDS */}
                {gameState.enemies.map((enemy) => {
                  const targetPlayer = players.find(p => p.id === enemy.targetPlayerId);
                  const isMine = enemy.targetPlayerId === myId;
                  
                  // 실시간 타이핑 하이라이트 계산
                  const { matched, unmatched } = checkInputMatching(enemy.text);
                  const hasMatchedSection = matched.length > 0;

                  return (
                    <div 
                      key={enemy.id} 
                      className={`absolute transform -translate-x-1/2 rounded border px-2.5 py-1 flex flex-col items-center bg-black/90 pointer-events-none transition-transform select-none ${
                        hasMatchedSection 
                          ? 'border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.3)] ring-1 ring-yellow-400/40 z-10' 
                          : isMine 
                          ? 'border-green-600 shadow-[0_0_8px_rgba(34,197,94,0.25)]' 
                          : 'border-zinc-800'
                      }`}
                      style={{ 
                        left: `${enemy.x}%`, 
                        top: `${enemy.y}px`, 
                        transition: 'top 0.05s linear' 
                      }}
                    >
                      <div className="text-xs sm:text-sm font-black tracking-wide font-mono flex">
                        {/* 하이라이트 매칭 섹션 */}
                        {hasMatchedSection && (
                          <span className="text-yellow-400 bg-yellow-950/50 px-0.5 rounded-l">{matched}</span>
                        )}
                        <span className={hasMatchedSection ? "text-green-300 bg-black/50 pr-0.5 rounded-r" :isMine ? "text-green-300" : "text-zinc-400"}>
                          {unmatched}
                        </span>
                      </div>
                      
                      {role !== 'SINGLE' && targetPlayer && (
                        <div className={`text-[8px] px-1 py-0.1 select-none font-bold scale-90 mt-0.5 rounded ${
                          isMine 
                            ? 'bg-green-950/80 text-green-300 border border-green-800/50' 
                            : 'bg-zinc-900 text-zinc-500'
                        }`}>
                          {isMine ? '🎯 나 전담' : `@요원: ${targetPlayer.name}`}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* EXPLOSIONS FX PARTICLES */}
                <AnimatePresence>
                  {explosions.map((ex) => (
                    <motion.div
                      key={ex.id}
                      initial={{ opacity: 1, scale: 0.6, y: ex.y }}
                      animate={{ opacity: 0, scale: 1.4, y: ex.y - 35 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="absolute transform -translate-x-1/2 text-center pointer-events-none z-10 select-none font-mono"
                      style={{ left: `${ex.x}%` }}
                    >
                      <div className="px-2 py-0.5 rounded border border-yellow-500/30 bg-black/95 text-yellow-400 font-extrabold text-[10px] sm:text-xs shadow-lg uppercase tracking-wider">
                        {ex.text}
                      </div>
                      <div className="text-yellow-500 text-[8px] mt-0.5">DECRYPTED</div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* INPUT CONTROLS BAR */}
              <div className="p-4 bg-black border-t border-zinc-900 flex flex-col sm:flex-row gap-3 items-center z-10 shadow-2xl">
                <div className="w-full flex-1 flex gap-2 items-center">
                  <div className="bg-zinc-900 border border-zinc-800 p-2 text-green-500 rounded shrink-0 flex items-center justify-center">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="보안 단어(코드)를 검증하고 Enter를 누르세요" 
                    value={typedWord} 
                    onChange={(e) => setTypedWord(e.target.value)} 
                    onKeyDown={handleKeyDown} 
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-4 py-3 text-green-400 font-extrabold tracking-widest focus:outline-none focus:border-green-500 focus:shadow-[0_0_12px_rgba(34,197,94,0.25)] text-sm placeholder-zinc-800"
                    disabled={!gameState.isPlaying}
                    autoFocus 
                  />
                </div>
                
                <button 
                  onClick={useEMPBlast} 
                  disabled={skillCooldown || !gameState.isPlaying} 
                  className={`w-full sm:w-auto px-5 py-3 rounded font-black text-xs flex items-center justify-center gap-2 border transition duration-200 select-none shrink-0 cursor-pointer ${
                    skillCooldown 
                      ? 'bg-zinc-900 border-zinc-950 text-zinc-650 cursor-not-allowed' 
                      : !gameState.isPlaying
                      ? 'bg-zinc-900/50 border-zinc-900 text-zinc-700 cursor-not-allowed'
                      : 'bg-yellow-950/80 hover:bg-yellow-900 border-yellow-600/80 text-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.2)] hover:shadow-[0_0_16px_rgba(234,179,8,0.4)] active:scale-95'
                  }`}
                >
                  <Zap className={`w-4 h-4 ${skillCooldown ? 'text-zinc-650' : 'text-yellow-400 animate-pulse'}`} />
                  {skillCooldown ? `EMP 과부하 (${skillTimeLeft}초)` : 'EMP 충격 파동 (전체 격파)'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER RULES/HELP PANEL */}
      <footer className="mt-2 bg-zinc-950 border border-zinc-900 rounded p-3 text-[10px] text-zinc-500 flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold border border-zinc-800 px-1.5 py-0.5 rounded bg-black text-yellow-500">도움말</span>
          <span>1. 요격에 성공하면 팀 점수 및 요원 개인기록 20점을 얻습니다.</span>
          <span>&middot;</span>
          <span>2. 단어가 바닥 한계선(THRESHOLD)에 닿으면 기지 가상 메모리 코어가 차감됩니다.</span>
          <span>&middot;</span>
          <span>3. 위기 순간에는 우측 하단의 EMP를 가동하여 광역 소멸을 시키세요.</span>
        </div>
        <div className="font-mono text-[9px] text-zinc-600">
          Engine: PeerJS WebRTC P2P mesh network + React 19 // Operative Operator Approved.
        </div>
      </footer>
    </div>
  );
}

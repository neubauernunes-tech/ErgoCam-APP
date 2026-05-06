/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Activity, 
  Target, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  ArrowLeft,
  Heart,
  LayoutDashboard,
  User,
  Info,
  BarChart3,
  Settings,
  Volume2,
  VolumeX,
  Timer,
  Trophy,
  Zap,
  RefreshCw,
  FileText
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as tf from '@tensorflow/tfjs-core';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';

// --- Types ---
type AppState = 'splash' | 'dashboard' | 'wellness' | 'analytics' | 'settings' | 'pricing';
type Language = 'pt' | 'en' | 'es';
type PostureStatus = 'good' | 'bad';
type UserPlan = 'free' | 'pro' | 'enterprise';

interface PostureData {
  time: string;
  score: number;
}

interface UserProfile {
  id: string;
  name: string;
  history: PostureData[];
  streak: number;
  sensitivity: number;
  calibrationOffset: number;
  audioEnabled: boolean;
  notificationsEnabled: boolean;
  plan: UserPlan;
}

const translations = {
  pt: {
    splash: {
      title: "Ergo",
      subtitle: "MONITOR DE POSTURA INTELIGENTE",
      button: "INICIAR MONITORAMENTO"
    },
    dashboard: {
      title: "Saúde e",
      titleAccent: "Visão Computacional",
      description: "Monitoramento ergonômico em tempo real através de algoritmos de precisão.",
      status: "Status",
      statusGood: "Postura Correta",
      statusBad: "Alerta de Postura",
      angle: "Desvio de Postura",
      fps: "FPS",
      alertTitle: "Atenção!",
      alertText: "Sua postura está incorreta. Por favor, alinhe sua coluna e pescoço.",
      alertTip: "Dica: Mantenha o topo da tela na altura dos olhos.",
      back: "Voltar ao Início",
      excessiveTilt: "INCLINAÇÃO EXCESSIVA",
      tipsTitle: "Dicas de Postura",
      tips: {
        eyes: { title: "Altura dos Olhos", text: "Topo da tela na altura dos olhos." },
        feet: { title: "Apoio dos Pés", text: "Pés totalmente apoiados no chão." },
        back: { title: "Encosto Lombar", text: "Costas totalmente encostadas no encosto." },
        breaks: { title: "Pausas Ativas", text: "Alongue-se a cada hora." }
      },
      pomodoro: "Modo Foco",
      calibrate: "Calibrar Algoritmo",
      sensitivity: "Sensibilidade"
    },
    analytics: {
      title: "Histórico e",
      titleAccent: "Estatísticas",
      description: "Acompanhe seu progresso e mantenha a consistência.",
      score: "Pontuação de Postura",
      streak: "Sequência Atual",
      days: "dias",
      goodTime: "Tempo em Boa Postura"
    },
    settings: {
      title: "Configurações",
      calibration: "Calibração Algorítmica",
      calibrationDesc: "O algoritmo precisa de 2 passos: 1. Saia da frente para calibrar o fundo. 2. Sente-se corretamente para definir sua postura ideal.",
      calibrateBtn: "Iniciar Calibração (2 Passos)",
      calibrating: "Passo 1: Saia da frente! Passo 2: Sente-se corretamente!",
      sensitivity: "Sensibilidade do Alerta",
      audio: "Alertas Sonoros",
      notifications: "Notificações do Sistema",
      on: "Ligado",
      off: "Desligado",
      upgrade: "Upgrade para Pro",
      currentPlan: "Plano Atual",
      deepAnalysis: "Análise Profunda (IA)",
      deepAnalysisDesc: "Usa visão computacional avançada para detectar posturas complexas (deitado, inclinação extrema).",
      profiles: "Perfis de Usuário",
      activeProfile: "Perfil Ativo",
      newProfile: "Novo Perfil",
      deleteProfile: "Excluir Perfil",
      profileName: "Nome do Perfil",
      create: "Criar",
      switch: "Alternar",
      downloadReport: "Baixar Relatório de Atualizações (PDF)",
      cameraPermission: {
        title: "Acesso à Câmera",
        description: "O ErgoCam utiliza sua câmera para analisar sua postura em tempo real usando algoritmos de detecção de movimento locais.",
        privacy: "Sua privacidade é nossa prioridade: o vídeo é processado inteiramente no seu navegador por algoritmos matemáticos e nunca é enviado para a nuvem.",
        button: "Conceder Permissão",
        deniedTitle: "Acesso Negado",
        deniedDescription: "Não conseguimos acessar sua câmera. Por favor, habilite o acesso nas configurações do seu navegador para usar o monitoramento.",
        retry: "Tentar Novamente"
      }
    },
    pricing: {
      title: "Escolha seu",
      titleAccent: "Plano",
      description: "Invista na sua saúde e produtividade com recursos avançados.",
      free: {
        name: "Gratuito",
        price: "R$ 0",
        period: "/mês",
        features: ["Monitoramento básico", "Histórico limitado (5)", "Alertas visuais"]
      },
      pro: {
        name: "Pro",
        price: "R$ 19,90",
        period: "/mês",
        features: ["IA Avançada", "Notificações do Sistema", "Histórico Completo", "Modo Pomodoro", "Sem anúncios"]
      },
      enterprise: {
        name: "Enterprise",
        price: "R$ 49,90",
        period: "/mês",
        features: ["Tudo do Pro", "Analytics de Equipe", "Suporte Prioritário", "Gestão de Licenças"]
      },
      cta: "Selecionar Plano",
      current: "Plano Atual"
    },
    wellness: {
      title: "Cuidado e",
      titleAccent: "Bem-Estar",
      description: "Guia prático para evitar desgaste e aliviar dores nas costas.",
      quote: "A prevenção é o melhor remédio. Pequenos ajustes hoje evitam grandes problemas amanhã.",
      sections: [
        {
          title: "Alívio Imediato",
          tips: [
            "Aplique compressas mornas na região lombar por 20 minutos.",
            "Realize a 'Posição da Criança' (Yoga) para alongar a coluna.",
            "Mantenha-se hidratado para garantir a saúde dos discos intervertebrais."
          ]
        },
        {
          title: "Exercícios de Fortalecimento",
          tips: [
            "Prancha Abdominal: Fortalece o core, essencial para sustentar a coluna.",
            "Ponte: Ativa os glúteos e estabiliza a região lombar.",
            "Super-homem: Fortalece os músculos eretores da espinha."
          ]
        },
        {
          title: "Calibração Precisa",
          tips: [
            "Sempre calibre o fundo sem ninguém na frente da câmera.",
            "Na segunda etapa, sente-se na sua postura mais ereta possível.",
            "Certifique-se de que sua cabeça esteja dentro da Zona de Detecção."
          ]
        }
      ]
    },
    nav: {
      monitor: "MONITOR",
      wellness: "BEM-ESTAR",
      stats: "STATS",
      pricing: "PLANOS",
      config: "AJUSTES"
    }
  },
  en: {
    splash: {
      title: "Ergo",
      subtitle: "SMART POSTURE MONITOR",
      button: "START MONITORING"
    },
    dashboard: {
      title: "Health &",
      titleAccent: "Computer Vision",
      description: "Real-time ergonomic monitoring using precision algorithms.",
      status: "Status",
      statusGood: "Good Posture",
      statusBad: "Posture Alert",
      angle: "Posture Deviation",
      fps: "FPS",
      alertTitle: "Attention!",
      alertText: "Your posture is incorrect. Please align your spine and neck.",
      alertTip: "Tip: Keep the top of the screen at eye level.",
      back: "Back to Home",
      excessiveTilt: "EXCESSIVE TILT",
      tipsTitle: "Posture Tips",
      tips: {
        eyes: { title: "Eye Level", text: "Top of screen at eye level." },
        feet: { title: "Foot Support", text: "Feet fully supported on the floor." },
        back: { title: "Lumbar Support", text: "Back fully against the backrest." },
        breaks: { title: "Active Breaks", text: "Stretch every hour." }
      },
      pomodoro: "Focus Mode",
      calibrate: "Calibrate Algorithm",
      sensitivity: "Sensitivity"
    },
    analytics: {
      title: "History &",
      titleAccent: "Statistics",
      description: "Track your progress and stay consistent.",
      score: "Posture Score",
      streak: "Current Streak",
      days: "days",
      goodTime: "Time in Good Posture"
    },
    settings: {
      title: "Settings",
      calibration: "Algorithmic Calibration",
      calibrationDesc: "The algorithm needs 2 steps: 1. Step out to calibrate background. 2. Sit correctly to set your ideal posture.",
      calibrateBtn: "Start Calibration (2 Steps)",
      calibrating: "Step 1: Step out! Step 2: Sit correctly!",
      sensitivity: "Alert Sensitivity",
      audio: "Audio Alerts",
      notifications: "System Notifications",
      on: "On",
      off: "Off",
      upgrade: "Upgrade to Pro",
      currentPlan: "Current Plan",
      deepAnalysis: "Deep Analysis (AI)",
      deepAnalysisDesc: "Uses advanced computer vision to detect complex postures (lying down, extreme tilt).",
      profiles: "User Profiles",
      activeProfile: "Active Profile",
      newProfile: "New Profile",
      deleteProfile: "Delete Profile",
      profileName: "Profile Name",
      create: "Create",
      switch: "Switch",
      downloadReport: "Download Update Report (PDF)",
      cameraPermission: {
        title: "Camera Access",
        description: "ErgoCam uses your camera to analyze your posture in real-time using local motion detection algorithms.",
        privacy: "Your privacy is our priority: video is processed entirely in your browser by mathematical algorithms and is never sent to the cloud.",
        button: "Grant Permission",
        deniedTitle: "Access Denied",
        deniedDescription: "We couldn't access your camera. Please enable access in your browser settings to use the monitoring features.",
        retry: "Try Again"
      }
    },
    pricing: {
      title: "Choose your",
      titleAccent: "Plan",
      description: "Invest in your health and productivity with advanced features.",
      free: {
        name: "Free",
        price: "$0",
        period: "/mo",
        features: ["Basic monitoring", "Limited history (5)", "Visual alerts"]
      },
      pro: {
        name: "Pro",
        price: "$4.99",
        period: "/mo",
        features: ["Advanced AI", "System Notifications", "Full History", "Pomodoro Mode", "No ads"]
      },
      enterprise: {
        name: "Enterprise",
        price: "$12.99",
        period: "/mo",
        features: ["Everything in Pro", "Team Analytics", "Priority Support", "License Management"]
      },
      cta: "Select Plan",
      current: "Current Plan"
    },
    wellness: {
      title: "Care &",
      titleAccent: "Wellness",
      description: "Practical guide to avoid wear and relieve back pain.",
      quote: "Prevention is the best medicine. Small adjustments today avoid big problems tomorrow.",
      sections: [
        {
          title: "Immediate Relief",
          tips: [
            "Apply warm compresses to the lower back for 20 minutes.",
            "Perform 'Child's Pose' (Yoga) to stretch the spine.",
            "Stay hydrated to ensure the health of intervertebral discs."
          ]
        },
        {
          title: "Strengthening Exercises",
          tips: [
            "Plank: Strengthens the core, essential for supporting the spine.",
            "Bridge: Activates glutes and stabilizes the lower back.",
            "Superman: Strengthens the spinal erector muscles."
          ]
        },
        {
          title: "Precise Calibration",
          tips: [
            "Always calibrate the background with no one in front of the camera.",
            "In the second step, sit in your most upright posture possible.",
            "Make sure your head is within the Detection Zone."
          ]
        }
      ]
    },
    nav: {
      monitor: "MONITOR",
      wellness: "WELLNESS",
      stats: "STATS",
      pricing: "PRICING",
      config: "SETTINGS"
    }
  },
  es: {
    splash: {
      title: "Ergo",
      subtitle: "MONITOR DE POSTURA INTELIGENTE",
      button: "INICIAR MONITOREO"
    },
    dashboard: {
      title: "Salud y",
      titleAccent: "Visión Artificial",
      description: "Monitoreo ergonómico en tiempo real mediante algoritmos de precisión.",
      status: "Estado",
      statusGood: "Postura Correcta",
      statusBad: "Alerta de Postura",
      angle: "Desviación de Postura",
      fps: "FPS",
      alertTitle: "¡Atención!",
      alertText: "Su postura es incorrecta. Por favor, alinee sua columna y cuello.",
      alertTip: "Consejo: Mantenga la parte superior de la pantalla a la altura de los ojos.",
      back: "Volver al Inicio",
      excessiveTilt: "INCLINACIÓN EXCESIVA",
      tipsTitle: "Consejos de Postura",
      tips: {
        eyes: { title: "Altura de Ojos", text: "Parte superior de la pantalla a la altura de los ojos." },
        feet: { title: "Apoyo de Pies", text: "Pies totalmente apoyados en el suelo." },
        back: { title: "Soporte Lumbar", text: "Espalda apoyada en el respaldo." },
        breaks: { title: "Pausas Activas", text: "Estírese cada hora." }
      },
      pomodoro: "Modo Enfoque",
      calibrate: "Calibrar Algoritmo",
      sensitivity: "Sensibilidad"
    },
    analytics: {
      title: "Historial y",
      titleAccent: "Estadísticas",
      description: "Siga su progreso y mantenga la consistencia.",
      score: "Puntuación de Postura",
      streak: "Racha Actual",
      days: "días",
      goodTime: "Tiempo en Buena Postura"
    },
    settings: {
      title: "Ajustes",
      calibration: "Calibración Algorítmica",
      calibrationDesc: "El algoritmo necesita 2 pasos: 1. Salga para calibrar el fondo. 2. Siéntese correctamente para definir su postura ideal.",
      calibrateBtn: "Iniciar Calibración (2 Pasos)",
      calibrating: "Paso 1: ¡Salga! Paso 2: ¡Siéntese correctamente!",
      sensitivity: "Sensibilidad de Alerta",
      audio: "Alertas Sonoras",
      notifications: "Notificaciones del Sistema",
      on: "Encendido",
      off: "Apagado",
      upgrade: "Mejorar a Pro",
      currentPlan: "Plan Actual",
      deepAnalysis: "Análisis Profundo (IA)",
      deepAnalysisDesc: "Usa visión computacional avanzada para detectar posturas complejas (acostado, inclinación extrema).",
      profiles: "Perfiles de Usuario",
      activeProfile: "Perfil Activo",
      newProfile: "Nuevo Perfil",
      deleteProfile: "Eliminar Perfil",
      profileName: "Nombre del Perfil",
      create: "Crear",
      switch: "Cambiar",
      downloadReport: "Descargar Informe de Actualizaciones (PDF)",
      cameraPermission: {
        title: "Acceso a la Cámara",
        description: "ErgoCam utiliza su cámara para analizar su postura en tiempo real usando inteligencia artificial local.",
        privacy: "Su privacidad es nuestra prioridad: el video se procesa íntegramente en su navegador y nunca se envía a la nube.",
        button: "Conceder Permiso",
        deniedTitle: "Acceso Denegado",
        deniedDescription: "No pudimos acceder a su cámara. Por favor, habilite el acceso en la configuración de su navegador para usar el monitoreo.",
        retry: "Intentar de Nuevo"
      }
    },
    pricing: {
      title: "Elige tu",
      titleAccent: "Plan",
      description: "Invierte en tu salud y productividad con funciones avanzadas.",
      free: {
        name: "Gratis",
        price: "0€",
        period: "/mes",
        features: ["Monitoreo básico", "Historial limitado (5)", "Alertas visuales"]
      },
      pro: {
        name: "Pro",
        price: "4,99€",
        period: "/mes",
        features: ["IA Avanzada", "Notificaciones del Sistema", "Historial Completo", "Modo Enfoque", "Sin anuncios"]
      },
      enterprise: {
        name: "Enterprise",
        price: "12,99€",
        period: "/mes",
        features: ["Todo en Pro", "Analítica de Equipo", "Soporte Prioritario", "Gestión de Licencias"]
      },
      cta: "Seleccionar Plan",
      current: "Plan Actual"
    },
    wellness: {
      title: "Cuidado y",
      titleAccent: "Bienestar",
      description: "Guía práctica para evitar el desgaste y aliviar los dolores de espalda.",
      quote: "La prevención es la mejor medicina. Pequeños ajustes hoy evitan grandes problemas mañana.",
      sections: [
        {
          title: "Alivio Inmediato",
          tips: [
            "Aplique compresas tibias en la zona lumbar durante 20 minutos.",
            "Realice la 'Posición del Niño' (Yoga) para estirar la columna.",
            "Manténgase hidratado para asegurar la salud de los discos intervertebrales."
          ]
        },
        {
          title: "Ejercicios de Fortalecimiento",
          tips: [
            "Plancha Abdominal: Fortalece el core, esencial para sostener la columna.",
            "Puente: Activa los glúteos y estabiliza la zona lumbar.",
            "Superman: Fortalece los músculos erectores de la columna."
          ]
        },
        {
          title: "Calibración Precisa",
          tips: [
            "Calibre siempre el fondo sin nadie frente a la cámara.",
            "En el segundo paso, siéntese en su postura más erguida posible.",
            "Asegúrese de que su cabeza esté dentro de la Zona de Detección."
          ]
        }
      ]
    },
    nav: {
      monitor: "MONITOR",
      wellness: "BIENESTAR",
      stats: "STATS",
      pricing: "PLANES",
      config: "AJUSTES"
    }
  }
};

// --- Components ---

const SplashScreen = ({ onStart, language, onSetLanguage }: { onStart: () => void, language: Language, onSetLanguage: (l: Language) => void }) => {
  const t = translations[language].splash;
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-dark-bg grid-bg p-6 text-center"
    >
      <div className="absolute top-8 right-8 flex gap-3">
        <button 
          onClick={() => onSetLanguage('pt')}
          className={`hover:scale-110 transition-transform cursor-pointer p-1 rounded-full border-2 overflow-hidden w-12 h-12 flex items-center justify-center ${language === 'pt' ? 'border-cyan-accent shadow-[0_0_15px_rgba(0,216,255,0.5)]' : 'border-white/10 opacity-40'}`}
          title="Português"
        >
          <img 
            src="https://flagcdn.com/w80/br.png" 
            alt="Brasil" 
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
          />
        </button>
        <button 
          onClick={() => onSetLanguage('en')}
          className={`hover:scale-110 transition-transform cursor-pointer p-1 rounded-full border-2 overflow-hidden w-12 h-12 flex items-center justify-center ${language === 'en' ? 'border-cyan-accent shadow-[0_0_15px_rgba(0,216,255,0.5)]' : 'border-white/10 opacity-40'}`}
          title="English"
        >
          <img 
            src="https://flagcdn.com/w80/us.png" 
            alt="USA" 
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
          />
        </button>
        <button 
          onClick={() => onSetLanguage('es')}
          className={`hover:scale-110 transition-transform cursor-pointer p-1 rounded-full border-2 overflow-hidden w-12 h-12 flex items-center justify-center ${language === 'es' ? 'border-cyan-accent shadow-[0_0_15px_rgba(0,216,255,0.5)]' : 'border-white/10 opacity-40'}`}
          title="Español"
        >
          <img 
            src="https://flagcdn.com/w80/es.png" 
            alt="España" 
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
          />
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-7xl md:text-9xl font-bold tracking-tighter">
          {t.title}<span className="text-cyan-accent">Cam</span>
        </h1>
        <p className="text-lg md:text-2xl font-light tracking-[0.3em] mt-4 opacity-80 uppercase">
          {t.subtitle}
        </p>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className="mt-12 flex items-center gap-2 bg-cyan-accent text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-white transition-colors cursor-pointer"
      >
        {t.button}
        <ChevronRight size={20} />
      </motion.button>
    </motion.div>
  );
};

interface Keypoint {
  x: number;
  y: number;
  name?: string;
  score?: number;
}

const PostureOverlay = ({ landmarks, roi, calibrationY, blob }: { 
  landmarks: Keypoint[] | null, 
  roi: { x: number, y: number, width: number, height: number },
  calibrationY: number | null,
  blob?: { x: number, y: number, width: number, height: number } | null
}) => {
  if (!landmarks && !blob) {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {calibrationY !== null && (
          <div 
            className="absolute left-0 right-0 border-t border-cyan-accent/30 border-dashed flex items-center justify-end pr-4"
            style={{ top: `${calibrationY * 100}%` }}
          >
            <span className="text-[10px] text-cyan-accent/50 uppercase tracking-widest font-bold">Ideal</span>
          </div>
        )}
        <div className="absolute inset-0 opacity-10 grid-bg" />
        <motion.div 
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 h-0.5 bg-cyan-accent/30 shadow-[0_0_10px_rgba(0,216,255,0.5)]"
        />
      </div>
    );
  }

  const getPoint = (name: string) => landmarks.find(kp => kp.name === name);
  const nose = getPoint('nose');
  const leftShoulder = getPoint('left_shoulder');
  const rightShoulder = getPoint('right_shoulder');
  const leftHip = getPoint('left_hip');
  const rightHip = getPoint('right_hip');
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* ROI Box */}
      <div 
        className="absolute border border-white/10 bg-white/5"
        style={{
          left: `${roi.x * 100}%`,
          top: `${roi.y * 100}%`,
          width: `${roi.width * 100}%`,
          height: `${roi.height * 100}%`
        }}
      />

      {/* Calibration Reference Line */}
      {calibrationY !== null && (
        <div 
          className="absolute left-0 right-0 border-t border-cyan-accent/30 border-dashed flex items-center justify-end pr-4"
          style={{ top: `${calibrationY * 100}%` }}
        >
          <span className="text-[10px] text-cyan-accent/50 uppercase tracking-widest font-bold">Ideal</span>
        </div>
      )}

      {/* Skeleton Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-30">
        {leftShoulder && rightShoulder && (
          <line 
            x1={`${leftShoulder.x * 100}%`} y1={`${leftShoulder.y * 100}%`}
            x2={`${rightShoulder.x * 100}%`} y2={`${rightShoulder.y * 100}%`}
            stroke="#00d8ff" strokeWidth="2"
          />
        )}
        {leftShoulder && leftHip && (
          <line 
            x1={`${leftShoulder.x * 100}%`} y1={`${leftShoulder.y * 100}%`}
            x2={`${leftHip.x * 100}%`} y2={`${leftHip.y * 100}%`}
            stroke="#00d8ff" strokeWidth="2"
          />
        )}
        {rightShoulder && rightHip && (
          <line 
            x1={`${rightShoulder.x * 100}%`} y1={`${rightShoulder.y * 100}%`}
            x2={`${rightHip.x * 100}%`} y2={`${rightHip.y * 100}%`}
            stroke="#00d8ff" strokeWidth="2"
          />
        )}
        {leftHip && rightHip && (
          <line 
            x1={`${leftHip.x * 100}%`} y1={`${leftHip.y * 100}%`}
            x2={`${rightHip.x * 100}%`} y2={`${rightHip.y * 100}%`}
            stroke="#00d8ff" strokeWidth="2"
          />
        )}
      </svg>

      {/* Nose/Head Tracker */}
      {nose && (
        <motion.div 
          animate={{ left: `${nose.x * 100}%`, top: `${nose.y * 100}%` }}
          className="absolute w-6 h-6 -ml-3 -mt-3 border-2 border-cyan-accent rounded-full flex items-center justify-center z-10" 
        >
          <div className="w-1 h-1 bg-cyan-accent rounded-full animate-pulse" />
        </motion.div>
      )}

      {/* Other Keypoints */}
      {[leftShoulder, rightShoulder, leftHip, rightHip].map((kp, i) => kp && (
        <motion.div 
          key={i}
          animate={{ left: `${kp.x * 100}%`, top: `${kp.y * 100}%` }}
          className="absolute w-2 h-2 -ml-1 -mt-1 bg-cyan-accent/40 rounded-full" 
        />
      ))}
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 opacity-10 grid-bg" />
    </div>
  );
};

const ROISelector = ({ roi, onRoiChange, isVisible, language }: { 
  roi: { x: number, y: number, width: number, height: number }, 
  onRoiChange: (roi: { x: number, y: number, width: number, height: number }) => void,
  isVisible: boolean,
  language: string
}) => {
  if (!isVisible) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const startX = (e.clientX - rect.left) / rect.width;
    const startY = (e.clientY - rect.top) / rect.height;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentX = (moveEvent.clientX - rect.left) / rect.width;
      const currentY = (moveEvent.clientY - rect.top) / rect.height;

      const newRoi = {
        x: Math.max(0, Math.min(startX, currentX)),
        y: Math.max(0, Math.min(startY, currentY)),
        width: Math.abs(currentX - startX),
        height: Math.abs(currentY - startY)
      };
      onRoiChange(newRoi);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div 
      className="absolute inset-0 z-50 cursor-crosshair bg-black/20"
      onMouseDown={handleMouseDown}
    >
      <div 
        className="absolute border-2 border-dashed border-cyan-accent bg-cyan-accent/10 pointer-events-none"
        style={{
          left: `${roi.x * 100}%`,
          top: `${roi.y * 100}%`,
          width: `${roi.width * 100}%`,
          height: `${roi.height * 100}%`
        }}
      >
        <div className="absolute -top-8 left-0 bg-cyan-accent text-black text-[10px] font-bold px-3 py-1 rounded uppercase tracking-widest whitespace-nowrap">
          {language === 'pt' ? 'Zona de Detecção' : language === 'es' ? 'Zona de Detección' : 'Detection Zone'}
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold text-white border border-white/10">
        {language === 'pt' ? 'Clique e arraste para definir a área' : language === 'es' ? 'Haga clic y arrastre para definir el área' : 'Click and drag to define the area'}
      </div>
    </div>
  );
};

const WellnessView = ({ language }: { language: Language }) => {
  const t = translations[language].wellness;
  const sections = t.sections.map((s, idx) => ({
    ...s,
    icon: idx === 0 ? <Heart className="text-red-400" size={24} /> : 
          idx === 1 ? <Activity className="text-cyan-accent" size={24} /> : 
          <CheckCircle2 className="text-emerald-400" size={24} />
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-12 max-w-5xl mx-auto pb-32"
    >
      <header className="text-center mb-12">
        <h2 className="text-4xl font-bold tracking-tight mb-4">
          {t.title} <span className="text-cyan-accent">{t.titleAccent}</span>
        </h2>
        <p className="text-white/60">{t.description}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-cyan-accent/30 transition-all">
            <div className="mb-6 flex justify-center">{section.icon}</div>
            <h3 className="text-xl font-bold text-center mb-6 uppercase tracking-widest text-cyan-accent">{section.title}</h3>
            <ul className="space-y-4">
              {section.tips.map((tip, tIdx) => (
                <li key={tIdx} className="flex gap-3 text-sm text-white/70 leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-accent mt-1.5 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-cyan-accent/10 border border-cyan-accent/20 rounded-3xl p-8 text-center">
        <Activity className="mx-auto text-cyan-accent mb-4" size={32} />
        <p className="text-white/80 italic">
          "{t.quote}"
        </p>
      </div>
    </motion.div>
  );
};

const AnalyticsView = ({ language, history, streak }: { language: Language, history: PostureData[], streak: number }) => {
  const t = translations[language].analytics;
  
  const avgScore = history.length > 0 
    ? Math.round(history.reduce((acc, curr) => acc + curr.score, 0) / history.length) 
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-12 max-w-5xl mx-auto pb-32"
    >
      <header className="text-center mb-12">
        <h2 className="text-4xl font-bold tracking-tight mb-4">
          {t.title} <span className="text-cyan-accent">{t.titleAccent}</span>
        </h2>
        <p className="text-white/60">{t.description}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
          <Trophy className="mx-auto text-yellow-400 mb-4" size={32} />
          <div className="text-sm text-white/40 uppercase tracking-widest mb-1">{t.streak}</div>
          <div className="text-4xl font-bold text-white">{streak} {t.days}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
          <Zap className="mx-auto text-cyan-accent mb-4" size={32} />
          <div className="text-sm text-white/40 uppercase tracking-widest mb-1">{t.score}</div>
          <div className="text-4xl font-bold text-white">{avgScore}%</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
          <Activity className="mx-auto text-emerald-400 mb-4" size={32} />
          <div className="text-sm text-white/40 uppercase tracking-widest mb-1">{t.goodTime}</div>
          <div className="text-4xl font-bold text-white">{(history.length * 10 / 60).toFixed(1)}h</div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 h-[400px]">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold uppercase tracking-widest text-cyan-accent">{t.score}</h3>
          {history.length >= 5 && history.length < 20 && (
            <div className="text-[10px] bg-white/10 px-3 py-1 rounded-full text-white/40 uppercase tracking-widest">
              Limited History (Free)
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d8ff" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00d8ff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="time" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
            <RechartsTooltip 
              contentStyle={{ backgroundColor: '#111', border: '1px solid #ffffff20', borderRadius: '12px' }}
              itemStyle={{ color: '#00d8ff' }}
            />
            <Area type="monotone" dataKey="score" stroke="#00d8ff" fillOpacity={1} fill="url(#colorScore)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

const PricingView = ({ language, currentPlan, onSelectPlan }: { language: Language, currentPlan: UserPlan, onSelectPlan: (plan: UserPlan) => void }) => {
  const t = translations[language].pricing;
  
  const plans: { id: UserPlan, data: any, icon: React.ReactNode, color: string }[] = [
    { id: 'free', data: t.free, icon: <Heart size={32} />, color: 'text-white/40' },
    { id: 'pro', data: t.pro, icon: <Zap size={32} />, color: 'text-cyan-accent' },
    { id: 'enterprise', data: t.enterprise, icon: <Trophy size={32} />, color: 'text-yellow-400' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-12 max-w-6xl mx-auto pb-32"
    >
      <header className="text-center mb-16">
        <h2 className="text-5xl font-black tracking-tighter mb-4 uppercase">
          {t.title} <span className="text-cyan-accent">{t.titleAccent}</span>
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">{t.description}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <motion.div 
            key={plan.id}
            whileHover={{ y: -10 }}
            className={`relative bg-white/5 border ${currentPlan === plan.id ? 'border-cyan-accent shadow-[0_0_30px_rgba(0,216,255,0.2)]' : 'border-white/10'} rounded-[40px] p-10 flex flex-col transition-all overflow-hidden`}
          >
            {currentPlan === plan.id && (
              <div className="absolute top-6 right-6 bg-cyan-accent text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                {t.current}
              </div>
            )}
            
            <div className={`mb-8 ${plan.color}`}>{plan.icon}</div>
            
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">{plan.data.name}</h3>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-black">{plan.data.price}</span>
              <span className="text-white/40 text-sm">{plan.data.period}</span>
            </div>
            
            <ul className="space-y-4 mb-12 flex-grow">
              {plan.data.features.map((feature: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-white/70">
                  <CheckCircle2 size={18} className="text-cyan-accent shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>
            
            <button 
              onClick={() => onSelectPlan(plan.id)}
              disabled={currentPlan === plan.id}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all ${currentPlan === plan.id ? 'bg-white/10 text-white/40 cursor-default' : 'bg-white text-black hover:bg-cyan-accent'}`}
            >
              {currentPlan === plan.id ? t.current : t.cta}
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const SettingsView = ({ 
  language, 
  sensitivity, 
  setSensitivity, 
  audioEnabled, 
  setAudioEnabled,
  notificationsEnabled,
  onToggleNotifications,
  onCalibrate,
  currentPlan,
  onUpgrade,
  profiles,
  activeProfileId,
  onSwitchProfile,
  onCreateProfile,
  onDeleteProfile,
  isCalibrating,
  isSelectingROI,
  onToggleROISelection,
  onDownloadReport,
  useML,
  onToggleML
}: { 
  language: Language, 
  sensitivity: number, 
  setSensitivity: (v: number) => void,
  audioEnabled: boolean,
  setAudioEnabled: (v: boolean) => void,
  notificationsEnabled: boolean,
  onToggleNotifications: () => void,
  onCalibrate: () => void,
  isCalibrating: boolean,
  currentPlan: UserPlan,
  onUpgrade: () => void,
  profiles: UserProfile[],
  activeProfileId: string,
  onSwitchProfile: (id: string) => void,
  onCreateProfile: (name: string) => void,
  onDeleteProfile: (id: string) => void,
  isSelectingROI: boolean,
  onToggleROISelection: () => void,
  onDownloadReport: () => void,
  useML: boolean,
  onToggleML: () => void
}) => {
  const t = translations[language].settings;
  const [newProfileName, setNewProfileName] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-12 max-w-3xl mx-auto pb-32"
    >
      <header className="text-center mb-12">
        <h2 className="text-4xl font-bold tracking-tight mb-4">
          {t.title}
        </h2>
      </header>

      <div className="space-y-8">
        {/* Profiles Management */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <User className="text-cyan-accent" size={24} />
            <h3 className="text-xl font-bold uppercase tracking-widest">{t.profiles}</h3>
          </div>
          
          <div className="space-y-4 mb-8">
            {profiles.map(profile => (
              <div key={profile.id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${profile.id === activeProfileId ? 'bg-cyan-accent shadow-[0_0_8px_rgba(0,216,255,0.6)]' : 'bg-white/20'}`} />
                  <span className={`font-bold ${profile.id === activeProfileId ? 'text-white' : 'text-white/40'}`}>{profile.name}</span>
                </div>
                <div className="flex gap-4">
                  {profile.id !== activeProfileId && (
                    <button 
                      onClick={() => onSwitchProfile(profile.id)}
                      className="text-[10px] uppercase tracking-widest font-bold text-cyan-accent hover:text-white transition-colors"
                    >
                      {t.switch}
                    </button>
                  )}
                  {profiles.length > 1 && (
                    <button 
                      onClick={() => onDeleteProfile(profile.id)}
                      className="text-[10px] uppercase tracking-widest font-bold text-red-500/60 hover:text-red-500 transition-colors"
                    >
                      {t.deleteProfile}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder={t.profileName}
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-accent transition-colors"
            />
            <button 
              onClick={() => {
                if (newProfileName.trim()) {
                  onCreateProfile(newProfileName.trim());
                  setNewProfileName('');
                }
              }}
              className="bg-cyan-accent text-black font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-white transition-colors"
            >
              {t.create}
            </button>
          </div>
        </div>

        {/* Plan Info */}
        <div className="bg-gradient-to-br from-cyan-accent/20 to-purple-500/20 border border-white/10 rounded-3xl p-8 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{t.currentPlan}</div>
            <div className="text-2xl font-black uppercase tracking-tighter text-cyan-accent">{currentPlan}</div>
          </div>
          <button 
            onClick={onUpgrade}
            className="bg-white text-black font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-cyan-accent transition-colors"
          >
            {t.upgrade}
          </button>
        </div>

        {/* Calibration */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          <div className="flex items-center gap-4 mb-4">
            <Target className="text-cyan-accent" size={24} />
            <h3 className="text-xl font-bold uppercase tracking-widest">{t.calibration}</h3>
          </div>
          <p className="text-white/60 text-sm mb-6">{t.calibrationDesc}</p>
          <div className="flex gap-4">
            <button 
              onClick={onCalibrate}
              disabled={isCalibrating}
              className={`flex-grow font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 ${isCalibrating ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-cyan-accent text-black hover:bg-white'}`}
            >
              {isCalibrating ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  {t.calibrating}
                </>
              ) : (
                t.calibrateBtn
              )}
            </button>
            <button 
              onClick={onToggleROISelection}
              className={`px-6 rounded-2xl border transition-all flex items-center justify-center ${isSelectingROI ? 'bg-cyan-accent text-black border-cyan-accent' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
              title={language === 'pt' ? 'Ajustar Zona de Detecção' : language === 'es' ? 'Ajustar Zona de Detección' : 'Adjust Detection Zone'}
            >
              <Target size={20} />
            </button>
          </div>
        </div>

        {/* Sensitivity */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <Zap className="text-cyan-accent" size={24} />
            <h3 className="text-xl font-bold uppercase tracking-widest">{t.sensitivity}</h3>
          </div>
          <input 
            type="range" 
            min="10" 
            max="50" 
            value={sensitivity} 
            onChange={(e) => setSensitivity(parseInt(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-accent"
          />
          <div className="flex justify-between mt-4 text-xs text-white/40 font-mono">
            <span>STRICT</span>
            <span>{sensitivity}°</span>
            <span>RELAXED</span>
          </div>
        </div>

        {/* Deep Analysis (ML) */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Activity className={useML ? "text-cyan-accent" : "text-white/40"} size={24} />
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest">{t.deepAnalysis}</h3>
              <p className="text-[10px] text-white/40 max-w-[200px]">{t.deepAnalysisDesc}</p>
            </div>
          </div>
          <button 
            onClick={onToggleML}
            className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${useML ? 'bg-cyan-accent text-black' : 'bg-white/10 text-white/40'}`}
          >
            {useML ? t.on : t.off}
          </button>
        </div>

        {/* Audio */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {audioEnabled ? <Volume2 className="text-cyan-accent" size={24} /> : <VolumeX className="text-white/40" size={24} />}
            <h3 className="text-xl font-bold uppercase tracking-widest">{t.audio}</h3>
          </div>
          <button 
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${audioEnabled ? 'bg-cyan-accent text-black' : 'bg-white/10 text-white/40'}`}
          >
            {audioEnabled ? t.on : t.off}
          </button>
        </div>

        {/* System Notifications */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Activity className={notificationsEnabled ? "text-cyan-accent" : "text-white/40"} size={24} />
            <h3 className="text-xl font-bold uppercase tracking-widest">{t.notifications}</h3>
          </div>
          <button 
            onClick={onToggleNotifications}
            className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${notificationsEnabled ? 'bg-cyan-accent text-black' : 'bg-white/10 text-white/40'}`}
          >
            {notificationsEnabled ? t.on : t.off}
          </button>
        </div>

        {/* Download Report */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FileText className="text-cyan-accent" size={24} />
            <h3 className="text-lg font-bold uppercase tracking-widest">{t.downloadReport}</h3>
          </div>
          <button 
            onClick={onDownloadReport}
            className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-all"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const CameraPermissionView = ({ language, onGrant, status }: { language: Language, onGrant: () => void, status: 'prompt' | 'granted' | 'denied' }) => {
  const t = translations[language].settings.cameraPermission;
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-xl mx-auto mt-12 p-8 bg-white/5 border border-white/10 rounded-3xl text-center"
    >
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${status === 'denied' ? 'bg-red-500/20 text-red-500' : 'bg-cyan-accent/20 text-cyan-accent'}`}>
        {status === 'denied' ? <AlertCircle size={40} /> : <Camera size={40} />}
      </div>
      <h2 className="text-3xl font-bold mb-4 uppercase tracking-tight">
        {status === 'denied' ? t.deniedTitle : t.title}
      </h2>
      <p className="text-white/70 mb-6 leading-relaxed">
        {status === 'denied' ? t.deniedDescription : t.description}
      </p>
      <div className="bg-cyan-accent/10 border border-cyan-accent/20 p-4 rounded-2xl mb-8 flex items-start gap-3 text-left">
        <Info size={20} className="text-cyan-accent shrink-0 mt-0.5" />
        <p className="text-xs text-cyan-accent/80 italic">
          {t.privacy}
        </p>
      </div>
      {status !== 'denied' && (
        <button 
          onClick={onGrant}
          className="w-full bg-cyan-accent text-black font-bold py-4 rounded-2xl hover:bg-white transition-all uppercase tracking-widest"
        >
          {t.button}
        </button>
      )}
    </motion.div>
  );
};

const BottomNav = ({ current, onNavigate, language }: { current: AppState, onNavigate: (s: AppState) => void, language: Language }) => {
  const t = translations[language].nav;
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full p-1.5 flex justify-center items-center gap-1 shadow-2xl overflow-hidden">
        <button 
          onClick={() => onNavigate('dashboard')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-full text-[10px] sm:text-xs font-bold transition-all shrink-0 ${current === 'dashboard' ? 'bg-cyan-accent text-black' : 'text-white/40 hover:text-white'}`}
        >
          <LayoutDashboard size={16} />
          <span className="hidden md:inline">{t.monitor}</span>
        </button>
        <button 
          onClick={() => onNavigate('wellness')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-full text-[10px] sm:text-xs font-bold transition-all shrink-0 ${current === 'wellness' ? 'bg-cyan-accent text-black' : 'text-white/40 hover:text-white'}`}
        >
          <Heart size={16} />
          <span className="hidden md:inline">{t.wellness}</span>
        </button>
        <button 
          onClick={() => onNavigate('analytics')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-full text-[10px] sm:text-xs font-bold transition-all shrink-0 ${current === 'analytics' ? 'bg-cyan-accent text-black' : 'text-white/40 hover:text-white'}`}
        >
          <BarChart3 size={16} />
          <span className="hidden md:inline">{t.stats}</span>
        </button>
        <button 
          onClick={() => onNavigate('pricing')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-full text-[10px] sm:text-xs font-bold transition-all shrink-0 ${current === 'pricing' ? 'bg-cyan-accent text-black' : 'text-white/40 hover:text-white'}`}
        >
          <Zap size={16} />
          <span className="hidden md:inline">{t.pricing}</span>
        </button>
        <button 
          onClick={() => onNavigate('settings')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-full text-[10px] sm:text-xs font-bold transition-all shrink-0 ${current === 'settings' ? 'bg-cyan-accent text-black' : 'text-white/40 hover:text-white'}`}
        >
          <Settings size={16} />
          <span className="hidden md:inline">{t.config}</span>
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [state, setState] = useState<AppState>('splash');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('ergo_lang') as Language) || 'pt');
  const [postureStatus, setPostureStatus] = useState<PostureStatus>('good');

  const generateReport = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(22);
    doc.setTextColor(0, 216, 255); // Cyan accent
    doc.text("ErgoCam - Relatório de Atualizações", 10, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 10, 30);
    
    // Section: Updates
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("1. Atualizações Implementadas", 10, 45);
    
    const updates = [
      ["Interface Cyberpunk", "UI moderna com animações Framer Motion e ícones Lucide."],
      ["Multi-idioma", "Suporte completo para Português, Inglês e Espanhol."],
      ["Detecção de Postura", "Algoritmo de visão computacional para monitoramento em tempo real."],
      ["Calibração de Fundo", "Sistema para ignorar ruído visual e focar no usuário."],
      ["Zona de Detecção (ROI)", "Seleção manual da área de monitoramento para maior precisão."],
      ["Gestão de Perfis", "Criação e alternância entre múltiplos perfis de usuário."],
      ["Estatísticas", "Gráficos de evolução de pontuação e tempo de postura correta."],
      ["Alertas", "Notificações visuais, sonoras e do sistema para má postura."],
      ["Planos e Assinaturas", "Estrutura de planos Free, Pro e Enterprise."]
    ];
    
    (doc as any).autoTable({
      startY: 50,
      head: [['Funcionalidade', 'Descrição']],
      body: updates,
      theme: 'grid',
      headStyles: { fillColor: [0, 216, 255] }
    });
    
    // Section: Difficulties
    const finalY = (doc as any).lastAutoTable.cursor.y || 150;
    doc.setFontSize(16);
    doc.text("2. Dificuldades de Implementação", 10, finalY + 20);
    
    const difficulties = [
      ["Processamento Real-time", "Garantir performance fluida (FPS alto) processando frames no navegador."],
      ["Robustez Algorítmica", "Lidar com variações de iluminação e fundos complexos sem usar modelos pesados de IA."],
      ["Privacidade", "Manter todo o processamento local, sem envio de dados para servidores."],
      ["UX de Calibração", "Tornar o processo de calibração intuitivo para usuários não técnicos."],
      ["Sincronização de Estado", "Gerenciar estados complexos entre câmera, configurações e estatísticas em tempo real."]
    ];
    
    (doc as any).autoTable({
      startY: finalY + 25,
      head: [['Desafio', 'Solução/Contexto']],
      body: difficulties,
      theme: 'striped',
      headStyles: { fillColor: [255, 99, 71] } // Tomato color for challenges
    });
    
    doc.save("ErgoCam_Update_Report.pdf");
  };
  
  // Profile Management State
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('ergo_profiles');
    if (saved) return JSON.parse(saved);
    return [{
      id: 'default',
      name: 'Padrão',
      history: JSON.parse(localStorage.getItem('ergo_history') || '[]'),
      streak: Number(localStorage.getItem('ergo_streak')) || 0,
      sensitivity: Number(localStorage.getItem('ergo_sensitivity')) || 15,
      calibrationOffset: Number(localStorage.getItem('ergo_calibration')) || 0,
      audioEnabled: localStorage.getItem('ergo_audio') !== 'false',
      notificationsEnabled: localStorage.getItem('ergo_notifications') === 'true',
      plan: (localStorage.getItem('ergo_plan') as UserPlan) || 'free'
    }];
  });
  const [activeProfileId, setActiveProfileId] = useState(() => localStorage.getItem('ergo_active_profile') || 'default');

  // Active Profile Data
  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  // Flat states for the active profile (synced)
  const [sensitivity, setSensitivity] = useState(activeProfile.sensitivity);
  const [audioEnabled, setAudioEnabled] = useState(activeProfile.audioEnabled);
  const [notificationsEnabled, setNotificationsEnabled] = useState(activeProfile.notificationsEnabled);
  const [calibrationOffset, setCalibrationOffset] = useState(activeProfile.calibrationOffset);
  const [history, setHistory] = useState<PostureData[]>(activeProfile.history);
  const [streak, setStreak] = useState(activeProfile.streak);
  const [plan, setPlan] = useState<UserPlan>(activeProfile.plan);

  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [landmarks, setLandmarks] = useState<Keypoint[] | null>(null);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [fps, setFps] = useState(0);
  const [isDetectorLoading, setIsDetectorLoading] = useState(false);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [backgroundFrame, setBackgroundFrame] = useState<ImageData | null>(null);
  const [roi, setRoi] = useState({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 }); // Normalized ROI
  const [isSelectingROI, setIsSelectingROI] = useState(false);
  const [isCalibratingBackground, setIsCalibratingBackground] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState<1 | 2 | null>(null);
  const [calibrationY, setCalibrationY] = useState<number | null>(null);
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [useML, setUseML] = useState(false);
  const [blob, setBlob] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  
  const lastNotificationTimeRef = useRef<number>(0);
  const lastHistoryUpdateRef = useRef<number>(0);
  
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const requestRef = useRef<number | null>(null);
  const smoothedPosRef = useRef<{x: number, y: number} | null>(null);
  const lastTimeRef = useRef<number>(0);

  const setLang = (l: Language) => setLanguage(l);
  const t = translations[language].dashboard;

  // Check camera permission on mount
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'camera' as PermissionName }).then((result) => {
        if (result.state === 'granted') {
          setCameraPermissionStatus('granted');
        } else if (result.state === 'denied') {
          setCameraPermissionStatus('denied');
        }
        result.onchange = () => {
          if (result.state === 'granted') setCameraPermissionStatus('granted');
          else if (result.state === 'denied') setCameraPermissionStatus('denied');
          else setCameraPermissionStatus('prompt');
        };
      });
    }
  }, []);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraPermissionStatus('granted');
      // Stop the stream immediately, we just wanted to trigger the prompt
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      setCameraPermissionStatus('denied');
      console.error("Camera permission denied:", err);
    }
  };

  // Persistence Effects (Global)
  useEffect(() => { localStorage.setItem('ergo_lang', language); }, [language]);
  useEffect(() => { localStorage.setItem('ergo_profiles', JSON.stringify(profiles)); }, [profiles]);
  useEffect(() => { localStorage.setItem('ergo_active_profile', activeProfileId); }, [activeProfileId]);

  // Sync flat states to profiles array
  useEffect(() => {
    setProfiles(prev => prev.map(p => p.id === activeProfileId ? {
      ...p,
      sensitivity,
      audioEnabled,
      notificationsEnabled,
      calibrationOffset,
      history,
      streak,
      plan
    } : p));
  }, [sensitivity, audioEnabled, notificationsEnabled, calibrationOffset, history, streak, plan, activeProfileId]);

  // Handle Profile Switching
  const handleSwitchProfile = (id: string) => {
    // Save current states to the current active profile first
    setProfiles(prev => prev.map(p => p.id === activeProfileId ? {
      ...p,
      sensitivity,
      audioEnabled,
      notificationsEnabled,
      calibrationOffset,
      history,
      streak,
      plan
    } : p));

    const target = profiles.find(p => p.id === id);
    if (target) {
      setActiveProfileId(id);
      setSensitivity(target.sensitivity);
      setAudioEnabled(target.audioEnabled);
      setNotificationsEnabled(target.notificationsEnabled);
      setCalibrationOffset(target.calibrationOffset);
      setHistory(target.history);
      setStreak(target.streak);
      setPlan(target.plan);
    }
  };

  const handleCreateProfile = (name: string) => {
    const newProfile: UserProfile = {
      id: Date.now().toString(),
      name,
      history: [],
      streak: 0,
      sensitivity: 25,
      calibrationOffset: 0,
      audioEnabled: true,
      notificationsEnabled: false,
      plan: 'free'
    };
    setProfiles(prev => [...prev, newProfile]);
    handleSwitchProfile(newProfile.id);
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.length <= 1) return;
    const newProfiles = profiles.filter(p => p.id !== id);
    setProfiles(newProfiles);
    if (activeProfileId === id) {
      handleSwitchProfile(newProfiles[0].id);
    }
  };

  const updateStatus = (newStatus: PostureStatus, angle: number) => {
    if (newStatus !== postureStatus) {
      setPostureStatus(newStatus);
      if (newStatus === 'bad') {
        playAlertSound();
        sendNotification(
          language === 'pt' ? 'Alerta de Postura!' : language === 'es' ? '¡Alerta de Postura!' : 'Posture Alert!',
          language === 'pt' ? 'Sua postura está incorreta.' : language === 'es' ? 'Su postura es incorrecta.' : 'Your posture is incorrect.'
        );
      }
    }

    const now = Date.now();
    if (now - lastHistoryUpdateRef.current > 60000) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const score = newStatus === 'good' ? 100 : Math.max(0, 100 - (angle - sensitivity) * 2);
      setHistory(prev => [...prev, { time: timeStr, score: Math.round(score) }].slice(plan === 'free' ? -5 : -20));
      lastHistoryUpdateRef.current = now;
      if (streak === 0) setStreak(1);
    }
  };

  // Algorithmic Posture Tracker (No AI)
  const runAlgorithmicTracker = async (time: number) => {
    if (lastTimeRef.current !== 0) {
      const delta = time - lastTimeRef.current;
      setFps(Math.round(1000 / delta));
    }
    lastTimeRef.current = time;

    if (
      webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4
    ) {
      const video = webcamRef.current.video;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          if (useML && detector) {
            try {
              const poses = await detector.estimatePoses(video);
              setBlob(null); // ML doesn't use blob tracking
              if (poses.length > 0) {
                const pose = poses[0];
                const keypoints = pose.keypoints.map(kp => ({
                  x: kp.x / canvas.width,
                  y: kp.y / canvas.height,
                  name: kp.name,
                  score: kp.score
                }));
                
                setLandmarks(keypoints as any);
                
                const nose = keypoints.find(k => k.name === 'nose');
                const leftShoulder = keypoints.find(k => k.name === 'left_shoulder');
                const rightShoulder = keypoints.find(k => k.name === 'right_shoulder');
                const leftHip = keypoints.find(k => k.name === 'left_hip');
                const rightHip = keypoints.find(k => k.name === 'right_hip');
                
                if (nose && leftShoulder && rightShoulder) {
                  const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
                  const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
                  
                  // 1. Lateral Tilt (Shoulder imbalance)
                  const lateralAngle = Math.round(shoulderDiff * 500);
                  
                  // 2. Vertical Slouch (Nose relative to shoulders)
                  const verticalDist = avgShoulderY - nose.y;
                  let verticalAngle = 0;
                  if (verticalDist < 0.08) { // Nose too close to shoulders
                    verticalAngle = Math.round((0.08 - verticalDist) * 1200);
                  }

                  // 3. Lying Down Detection (Hip vs Shoulder)
                  let lyingAngle = 0;
                  if (leftHip && rightHip) {
                    const avgHipY = (leftHip.y + rightHip.y) / 2;
                    const bodyVerticality = Math.abs(avgHipY - avgShoulderY);
                    if (bodyVerticality < 0.15) { // Body is too horizontal
                      lyingAngle = Math.round((0.15 - bodyVerticality) * 1000);
                    }
                  }
                  
                  const maxAngle = Math.max(lateralAngle, verticalAngle, lyingAngle);
                  setCurrentAngle(maxAngle);
                  const newStatus = maxAngle > sensitivity ? 'bad' : 'good';
                  updateStatus(newStatus, maxAngle);
                }
              } else {
                setLandmarks(null);
                setCurrentAngle(0);
              }
            } catch (err) {
              console.error("ML Inference Error:", err);
            }
          } else if (backgroundFrame) {
            const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const startY = Math.floor(roi.y * canvas.height);
            const endY = Math.floor((roi.y + roi.height) * canvas.height);
            const startX = Math.floor(roi.x * canvas.width);
            const endX = Math.floor((roi.x + roi.width) * canvas.width);

            let totalX = 0;
            let totalY = 0;
            let count = 0;
            let minY = endY;
            let minX = endX;
            let maxX = startX;
            let maxY = startY;
            const threshold = 15;

            // Sample pixels to find centroid and top-most point
            for (let y = startY; y < endY; y += 4) {
              for (let x = startX; x < endX; x += 4) {
                const i = (y * canvas.width + x) * 4;
                const rDiff = Math.abs(currentFrame.data[i] - backgroundFrame.data[i]);
                const gDiff = Math.abs(currentFrame.data[i+1] - backgroundFrame.data[i+1]);
                const bDiff = Math.abs(currentFrame.data[i+2] - backgroundFrame.data[i+2]);

                if (rDiff + gDiff + bDiff > threshold * 3) {
                  totalX += x;
                  totalY += y;
                  count++;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                }
              }
            }

            if (count > 20) { 
              const rawX = totalX / count;
              const rawY = minY; // Use top-most point for vertical tracking

              // Set blob for visual feedback
              setBlob({
                x: minX / canvas.width,
                y: minY / canvas.height,
                width: (maxX - minX) / canvas.width,
                height: (maxY - minY) / canvas.height
              });

              // Exponential Moving Average for smoothing
              const alpha = 0.25; // Slightly faster response
              if (!smoothedPosRef.current) {
                smoothedPosRef.current = { x: rawX, y: rawY };
              } else {
                smoothedPosRef.current.x = smoothedPosRef.current.x * (1 - alpha) + rawX * alpha;
                smoothedPosRef.current.y = smoothedPosRef.current.y * (1 - alpha) + rawY * alpha;
              }

              const currentX = smoothedPosRef.current.x;
              const currentY = smoothedPosRef.current.y;

              const centerX = canvas.width / 2;
              const lateralDeviation = Math.abs(currentX - centerX);
              const lateralAngle = Math.round((lateralDeviation / (canvas.width / 2)) * 60);
              
              // Vertical deviation (slouching/leaning back)
              let verticalAngle = 0;
              if (calibrationY !== null) {
                const verticalDiff = currentY - calibrationY;
                // Slouching down is very common and bad for posture
                // We use an extremely high multiplier for maximum sensitivity
                if (verticalDiff > 2) { 
                  verticalAngle = Math.round((verticalDiff / canvas.height) * 1500);
                } else if (verticalDiff < -15) {
                  // Significant upward movement
                  verticalAngle = Math.round((Math.abs(verticalDiff) / canvas.height) * 200);
                }
              }

              // Lying Down Detection (Aspect Ratio)
              let lyingAngle = 0;
              const blobWidth = maxX - minX;
              const blobHeight = maxY - minY;
              // If the blob is wider than it is tall, it's a strong indicator of lying down
              if (blobWidth > blobHeight * 0.9) { 
                lyingAngle = Math.round((blobWidth / blobHeight) * 100);
              }
              // If the blob is very short vertically, it's also an indicator
              if (blobHeight < canvas.height * 0.2) {
                lyingAngle = Math.max(lyingAngle, 45);
              }

              const maxAngle = Math.max(lateralAngle, verticalAngle, lyingAngle);
              setCurrentAngle(maxAngle);

              // NORMALIZE LANDMARKS (0 to 1)
              setLandmarks([
                { x: currentX / canvas.width, y: currentY / canvas.height, name: 'nose' } as any
              ]);

              const newStatus = maxAngle > sensitivity ? 'bad' : 'good';
              updateStatus(newStatus, maxAngle);
            } else {
              setLandmarks(null);
              setBlob(null);
              setCurrentAngle(0);
            }
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(runAlgorithmicTracker);
  };

  const calibrateBackground = () => {
    if (!webcamRef.current || !webcamRef.current.video) return;
    setIsCalibratingBackground(true);
    setCalibrationStep(1);
    
    // Step 1: Calibrate Background (User must be out of frame)
    setTimeout(() => {
      const video = webcamRef.current!.video!;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const bgFrame = ctx?.getImageData(0, 0, canvas.width, canvas.height) || null;
      setBackgroundFrame(bgFrame);
      
      setCalibrationStep(2);
      
      // Step 2: Calibrate Posture (User must be in frame with good posture)
      setTimeout(() => {
        if (!webcamRef.current || !webcamRef.current.video) return;
        const video2 = webcamRef.current!.video!;
        const canvas2 = document.createElement('canvas');
        canvas2.width = video2.videoWidth;
        canvas2.height = video2.videoHeight;
        const ctx2 = canvas2.getContext('2d');
        ctx2?.drawImage(video2, 0, 0);
        const currentFrame = ctx2?.getImageData(0, 0, canvas2.width, canvas2.height);
        
        if (currentFrame && bgFrame) {
          // Find the top-most point of the user in good posture
          let minY = canvas2.height;
          let count = 0;
          const threshold = 15;
          
          for (let y = 0; y < canvas2.height; y += 8) {
            for (let x = 0; x < canvas2.width; x += 8) {
              const i = (y * canvas2.width + x) * 4;
              const rDiff = Math.abs(currentFrame.data[i] - bgFrame.data[i]);
              const gDiff = Math.abs(currentFrame.data[i+1] - bgFrame.data[i+1]);
              const bDiff = Math.abs(currentFrame.data[i+2] - bgFrame.data[i+2]);
              if (rDiff + gDiff + bDiff > threshold * 3) {
                if (y < minY) minY = y;
                count++;
              }
            }
          }
          if (count > 20) {
            setCalibrationY(minY);
          }
        }
        setIsCalibratingBackground(false);
        setCalibrationStep(null);
      }, 4000);
    }, 3000);
  };

  useEffect(() => {
    const initDetector = async () => {
      try {
        // Ensure TensorFlow.js is ready and backend is set
        await tf.ready();
        try {
          await tf.setBackend('webgl');
        } catch (backendErr) {
          console.warn("Could not set webgl backend, falling back to default:", backendErr);
        }
        
        const model = poseDetection.SupportedModels.BlazePose;
        const detectorConfig = {
          runtime: 'tfjs',
          modelType: 'lite'
        };
        const newDetector = await poseDetection.createDetector(model, detectorConfig as any);
        setDetector(newDetector);
      } catch (err) {
        console.error("Failed to initialize Pose Detector:", err);
      }
    };
    initDetector();
  }, []);

  useEffect(() => {
    if (state === 'dashboard') {
      requestRef.current = requestAnimationFrame(runAlgorithmicTracker);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [state, backgroundFrame, sensitivity, plan, language]);

  // Sound Alert Logic
  const playAlertSound = () => {
    if (!audioEnabled) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const sendNotification = (title: string, body: string) => {
    if (plan === 'free') return; // Restriction
    if (!notificationsEnabled || Notification.permission !== 'granted') return;
    
    // Throttle notifications to once every 30 seconds
    const now = Date.now();
    if (now - lastNotificationTimeRef.current < 30000) return;
    
    new Notification(title, {
      body,
      icon: 'https://picsum.photos/seed/ergo/128/128'
    });
    lastNotificationTimeRef.current = now;
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
      } else {
        setNotificationsEnabled(false);
      }
    }
  };

  // Pomodoro Timer
  useEffect(() => {
    let interval: any;
    if (isPomodoroActive && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime(prev => prev - 1);
      }, 1000);
    } else if (pomodoroTime === 0) {
      setIsPomodoroActive(false);
      playAlertSound();
    }
    return () => clearInterval(interval);
  }, [isPomodoroActive, pomodoroTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white font-sans selection:bg-cyan-accent selection:text-black">
      <AnimatePresence>
        {state === 'splash' && (
          <SplashScreen 
            onStart={() => setState('dashboard')} 
            language={language} 
            onSetLanguage={setLang} 
          />
        )}
      </AnimatePresence>

      {(state === 'dashboard' || state === 'wellness' || state === 'analytics' || state === 'settings' || state === 'pricing') && (
        <motion.main 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative min-h-screen p-6 md:p-12 max-w-7xl mx-auto"
        >
          {/* Red Flash Overlay */}
          <AnimatePresence>
            {postureStatus === 'bad' && state === 'dashboard' && (
              <motion.div 
                key="red-flash-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.25 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 1, 
                  repeat: Infinity, 
                  repeatType: "reverse",
                  ease: "easeInOut"
                }}
                className="fixed inset-0 z-40 bg-red-600 pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Header */}
          <header className="relative flex flex-col items-center mb-12 text-center">
            {/* Profile Badge (Top Left - below back button) */}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setState('settings')}
              className="absolute left-0 top-16 flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full hover:bg-white/10 transition-all z-50"
            >
              <User size={14} className="text-cyan-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">{activeProfile.name}</span>
            </motion.button>

            {/* Back Button (Top Left) */}
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setState('splash')}
              className="absolute left-0 top-0 p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:text-cyan-accent transition-all cursor-pointer z-50"
              title={t.back}
            >
              <ArrowLeft size={24} />
            </motion.button>

            {/* Language Toggle (Top Right) */}
            <div className="absolute right-0 top-0 flex gap-3">
              <button 
                onClick={() => setLang('pt')}
                className={`hover:scale-110 transition-transform cursor-pointer p-0.5 rounded-full border-2 overflow-hidden w-10 h-10 flex items-center justify-center ${language === 'pt' ? 'border-cyan-accent shadow-[0_0_10px_rgba(0,216,255,0.4)]' : 'border-white/10 opacity-40'}`}
                title="Português"
              >
                <img 
                  src="https://flagcdn.com/w80/br.png" 
                  alt="Brasil" 
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              </button>
              <button 
                onClick={() => setLang('en')}
                className={`hover:scale-110 transition-transform cursor-pointer p-0.5 rounded-full border-2 overflow-hidden w-10 h-10 flex items-center justify-center ${language === 'en' ? 'border-cyan-accent shadow-[0_0_10px_rgba(0,216,255,0.4)]' : 'border-white/10 opacity-40'}`}
                title="English"
              >
                <img 
                  src="https://flagcdn.com/w80/us.png" 
                  alt="USA" 
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              </button>
              <button 
                onClick={() => setLang('es')}
                className={`hover:scale-110 transition-transform cursor-pointer p-0.5 rounded-full border-2 overflow-hidden w-10 h-10 flex items-center justify-center ${language === 'es' ? 'border-cyan-accent shadow-[0_0_10px_rgba(0,216,255,0.4)]' : 'border-white/10 opacity-40'}`}
                title="Español"
              >
                <img 
                  src="https://flagcdn.com/w80/es.png" 
                  alt="España" 
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              </button>
            </div>

            {state === 'dashboard' && (
              <>
                <div className="max-w-2xl">
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                    {t.title} <span className="text-cyan-accent">{t.titleAccent}</span>
                  </h2>
                  <p className="text-white/60 mt-4">
                    {t.description}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-4 mt-8">
                  <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className={`w-3 h-3 rounded-full ${postureStatus === 'good' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse'}`} />
                    <span className={`font-mono text-sm uppercase tracking-widest transition-colors duration-300 ${postureStatus === 'bad' ? 'text-red-400' : 'text-white'}`}>
                      {t.status}: {postureStatus === 'good' ? t.statusGood : t.statusBad}
                    </span>
                  </div>

                  <button 
                    onClick={() => {
                      if (plan === 'free') {
                        setState('pricing');
                        return;
                      }
                      setIsPomodoroActive(!isPomodoroActive);
                    }}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${isPomodoroActive ? 'bg-cyan-accent/20 border-cyan-accent text-cyan-accent' : 'bg-white/5 border-white/10 text-white/60'}`}
                  >
                    <Timer size={20} />
                    <span className="font-mono font-bold">{formatTime(pomodoroTime)}</span>
                    {plan === 'free' && <Zap size={12} className="text-cyan-accent ml-1" />}
                  </button>
                </div>
              </>
            )}
          </header>

          {state === 'dashboard' && (
            <div className="relative">
              {cameraPermissionStatus !== 'granted' ? (
                <CameraPermissionView 
                  language={language} 
                  onGrant={requestCameraPermission} 
                  status={cameraPermissionStatus}
                />
              ) : (
                <>
                  {/* Main Content: Camera View (Full Width) */}
                  <div className="w-full">
                    <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        mirrored={true}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={1}
                        className="w-full h-full object-cover opacity-100 brightness-100"
                        onUserMedia={() => {}}
                        onUserMediaError={() => {}}
                        imageSmoothing={true}
                        forceScreenshotSourceSize={false}
                        disablePictureInPicture={true}
                      />
                      
                      <PostureOverlay 
                        landmarks={landmarks} 
                        roi={roi} 
                        calibrationY={calibrationY !== null ? calibrationY / (webcamRef.current?.video?.videoHeight || 1) : null} 
                        blob={blob}
                      />

                      {/* Live Score Badge */}
                      <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${postureStatus === 'good' ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">
                            {t.angle}: {currentAngle}
                          </span>
                        </div>
                        {calibrationY === null && (
                           <div className="bg-amber-500/20 border border-amber-500/50 text-amber-400 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest backdrop-blur-md">
                             {language === 'pt' ? 'Calibração Necessária' : 'Calibration Required'}
                           </div>
                        )}
                      </div>
                      
                      <ROISelector 
                        roi={roi} 
                        onRoiChange={setRoi} 
                        isVisible={isSelectingROI} 
                        language={language}
                      />

                      {/* Calibration Prompt */}
                      {!backgroundFrame && !isCalibratingBackground && (
                        <div className="absolute inset-0 flex items-center justify-center z-40">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={calibrateBackground}
                            className="bg-cyan-accent text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_30px_rgba(0,216,255,0.5)] flex items-center gap-3"
                          >
                            <RefreshCw size={24} className="animate-spin-slow" />
                            {language === 'pt' ? 'Calibrar para Iniciar' : language === 'es' ? 'Calibrar para Iniciar' : 'Calibrate to Start'}
                          </motion.button>
                        </div>
                      )}

                      {/* ROI Toggle and Reset Buttons */}
                      <div className="absolute top-4 right-4 z-50 flex gap-2">
                        <button 
                          onClick={() => {
                            setBackgroundFrame(null);
                            setCalibrationY(null);
                            setIsSelectingROI(false);
                          }}
                          className="p-3 rounded-xl backdrop-blur-md border bg-black/40 text-white border-white/10 hover:bg-red-500/40 hover:border-red-500 transition-all"
                          title={language === 'pt' ? 'Resetar Calibração' : language === 'es' ? 'Reiniciar Calibración' : 'Reset Calibration'}
                        >
                          <RefreshCw size={20} />
                        </button>
                        <button 
                          onClick={() => setIsSelectingROI(!isSelectingROI)}
                          className={`p-3 rounded-xl backdrop-blur-md border transition-all ${isSelectingROI ? 'bg-cyan-accent text-black border-cyan-accent' : 'bg-black/40 text-white border-white/10 hover:bg-black/60'}`}
                          title={language === 'pt' ? 'Ajustar Zona de Detecção' : language === 'es' ? 'Ajustar Zona de Detección' : 'Adjust Detection Zone'}
                        >
                          <Target size={20} />
                        </button>
                      </div>

                      {/* Background Calibration Overlay */}
                      <AnimatePresence>
                        {(!backgroundFrame || isCalibratingBackground) && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-8 text-center"
                          >
                            {isCalibratingBackground ? (
                              <>
                                <motion.div 
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                  className="w-16 h-16 border-4 border-cyan-accent border-t-transparent rounded-full mb-6"
                                />
                                <div className="text-cyan-accent font-bold uppercase tracking-widest animate-pulse text-xl">
                                  {calibrationStep === 1 
                                    ? (language === 'pt' ? 'Passo 1: Saia da frente da câmera!' : language === 'es' ? 'Paso 1: ¡Salga de la cámara!' : 'Step 1: Step out of the frame!')
                                    : (language === 'pt' ? 'Passo 2: Sente-se o mais ereto possível!' : language === 'es' ? 'Paso 2: ¡Siéntese lo más erguido posible!' : 'Step 2: Sit as straight as possible!')
                                  }
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="bg-cyan-accent/20 p-6 rounded-full mb-6">
                                  <RefreshCw size={48} className="text-cyan-accent" />
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">
                                  {translations[language].settings.calibration}
                                </h3>
                                <p className="text-white/60 mb-8 max-w-xs">
                                  {translations[language].settings.calibrationDesc}
                                </p>
                                <button 
                                  onClick={calibrateBackground}
                                  className="bg-cyan-accent text-black font-black px-8 py-4 rounded-2xl text-sm uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(0,216,255,0.4)]"
                                >
                                  {translations[language].settings.calibrateBtn}
                                </button>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                  {/* Posture Alert Popup (Modal) */}
                  <AnimatePresence>
                    {postureStatus === 'bad' && (
                      <motion.div 
                        key="posture-alert-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
                      >
                        <motion.div 
                          initial={{ scale: 0.8, y: 20 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0.8, y: 20 }}
                          className="bg-red-600 text-white p-8 rounded-3xl shadow-2xl max-w-md text-center border-4 border-white/20"
                        >
                          <motion.div 
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="flex justify-center mb-4"
                          >
                            <AlertCircle size={64} />
                          </motion.div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">{t.alertTitle}</h3>
                          <p className="text-lg font-bold mb-6">{t.alertText}</p>
                          <div className="bg-white/20 p-4 rounded-xl text-sm font-medium">
                            {t.alertTip}
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Floating Tips Icon */}
                  <div className="absolute top-6 right-6 z-20 group">
                    <motion.div 
                      whileHover={{ scale: 1.1 }}
                      className="bg-cyan-accent text-black p-3 rounded-full shadow-lg cursor-help flex items-center justify-center"
                    >
                      <Info size={24} />
                    </motion.div>
                    
                    {/* Tooltip / Info Panel */}
                    <div className="absolute top-0 right-14 w-72 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                      <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl space-y-4">
                        <div className="flex items-center gap-2 text-cyan-accent border-b border-white/10 pb-2">
                          <CheckCircle2 size={18} />
                          <h3 className="text-sm font-bold uppercase tracking-widest">{t.tipsTitle}</h3>
                        </div>
                        
                        <div className="space-y-4">
                          {(Object.values(t.tips) as {title: string, text: string}[]).map((tip, idx) => (
                            <div key={idx}>
                              <h4 className="text-xs font-bold text-cyan-accent uppercase mb-1">{tip.title}</h4>
                              <p className="text-[11px] text-white/70 leading-relaxed">
                                {tip.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status HUD */}
                  <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                    <div className="flex gap-2">
                      <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10">
                        <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{t.angle}</div>
                        <div className="font-mono text-2xl text-cyan-accent">
                          {currentAngle}°
                        </div>
                      </div>
                      {useML && (
                        <div className="bg-cyan-accent/10 backdrop-blur-md p-4 rounded-xl border border-cyan-accent/30 flex items-center gap-3">
                          <Activity className="text-cyan-accent animate-pulse" size={20} />
                          <div className="text-[10px] text-cyan-accent font-black uppercase tracking-widest">AI ACTIVE</div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {/* Sensitivity Quick Adjust */}
                      <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 w-48">
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-[10px] text-white/40 uppercase tracking-widest">{t.sensitivity}</div>
                          <div className="text-[10px] font-mono text-cyan-accent">{sensitivity}</div>
                        </div>
                        <input 
                          type="range" 
                          min="5" 
                          max="40" 
                          value={sensitivity} 
                          onChange={(e) => setSensitivity(Number(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-accent"
                        />
                      </div>

                      {postureStatus === 'bad' && (
                        <motion.div 
                          initial={{ x: 20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold backdrop-blur-md"
                        >
                          <AlertCircle size={16} />
                          {t.excessiveTilt}
                        </motion.div>
                      )}
                      <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10">
                        <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{t.fps}</div>
                        <div className="font-mono text-xl">{fps.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Corner Accents */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-cyan-accent rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cyan-accent rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyan-accent rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-cyan-accent rounded-br-lg" />
                </div>

                {/* Privacy Badge */}
                <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-white/40 uppercase tracking-[0.2em]">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span>{t.privacyLocal}</span>
                  <span className="mx-2 opacity-20">|</span>
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span>{t.privacySecure}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

          {state === 'wellness' && <WellnessView language={language} />}
          {state === 'analytics' && <AnalyticsView language={language} history={history} streak={streak} />}
          {state === 'pricing' && (
            <PricingView 
              language={language} 
              currentPlan={plan} 
              onSelectPlan={(newPlan) => {
                setPlan(newPlan);
                setState('dashboard');
              }} 
            />
          )}
          {state === 'settings' && (
            <SettingsView 
              language={language} 
              sensitivity={sensitivity}
              setSensitivity={setSensitivity}
              audioEnabled={audioEnabled}
              setAudioEnabled={setAudioEnabled}
              notificationsEnabled={notificationsEnabled}
              onToggleNotifications={() => {
                if (plan === 'free') {
                  setState('pricing');
                  return;
                }
                if (!notificationsEnabled) {
                  requestNotificationPermission();
                } else {
                  setNotificationsEnabled(false);
                }
              }}
              onCalibrate={calibrateBackground}
              isCalibrating={isCalibratingBackground}
              isSelectingROI={isSelectingROI}
              onToggleROISelection={() => setIsSelectingROI(!isSelectingROI)}
              currentPlan={plan}
              onUpgrade={() => setState('pricing')}
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSwitchProfile={handleSwitchProfile}
              onCreateProfile={handleCreateProfile}
              onDeleteProfile={handleDeleteProfile}
              onDownloadReport={generateReport}
              useML={useML}
              onToggleML={() => setUseML(!useML)}
            />
          )}
        </motion.main>
      )}

      {(state === 'dashboard' || state === 'wellness' || state === 'analytics' || state === 'settings' || state === 'pricing') && (
        <BottomNav current={state} onNavigate={setState} language={language} />
      )}
    </div>
  );
}

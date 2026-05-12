const fs = require('fs');

let content = fs.readFileSync('src/app/room/[code]/page.tsx', 'utf8');

content = content.replace(
  'import { useEffect, useState, Suspense } from "react";',
  'import { useEffect, useState, Suspense, useRef } from "react";'
);

content = content.replace(
  'const [timeLeft, setTimeLeft] = useState(180);',
  'const [timeLeft, setTimeLeft] = useState(180);\n  const lastProcessedIndex = useRef(-1);'
);

const oldEffects =   useEffect(() => {
    if (room?.state === "PLAYING") setTimeLeft(180);
  }, [room?.currentQuestionIndex, room?.state]);

  useEffect(() => {
    if (!room || room.state !== "PLAYING" || !room.questions || !room.questions[room.currentQuestionIndex] || (socket.id && room.answers && room.answers[socket.id])) return;
    if (timeLeft <= 0) {
      handleSubmit(true);
      return;
    }
    const timerId = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [room?.state, room?.currentQuestionIndex, room?.answers, timeLeft]);;

const newEffects =   useEffect(() => {
    if (!room || room.state !== "PLAYING") return;
    
    // Reset timer when question changes
    if (room.currentQuestionIndex !== lastProcessedIndex.current) {
        lastProcessedIndex.current = room.currentQuestionIndex;
        setTimeLeft(180);
        return;
    }

    if (!room.questions || !room.questions[room.currentQuestionIndex] || (socket.id && room.answers && room.answers[socket.id])) return;

    if (timeLeft <= 0) {
      handleSubmit(true);
      return;
    }
    const timerId = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [room?.state, room?.currentQuestionIndex, room?.answers, timeLeft]);;

content = content.replace(oldEffects, newEffects);

fs.writeFileSync('src/app/room/[code]/page.tsx', content, 'utf8');

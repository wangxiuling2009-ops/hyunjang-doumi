import { useRef, useState, useCallback, useEffect } from 'react';

interface Props {
  imageUrl: string;
  onSave: (annotatedDataUrl: string) => void;
  onCancel: () => void;
}

export default function PhotoAnnotate({ imageUrl, onSave, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(4);

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const maxW = Math.min(window.innerWidth - 32, 400);
    const scale = maxW / img.width;
    canvas.width = maxW;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; drawImage(); };
    img.src = imageUrl;
  }, [imageUrl, drawImage]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const handleSave = () => {
    const dataUrl = canvasRef.current?.toDataURL('image/jpeg', 0.8);
    if (dataUrl) onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl p-3 max-w-full">
        <p className="text-sm text-gray-600 text-center mb-2">Mark on photo / draw circle</p>
        <canvas
          ref={canvasRef}
          className="touch-none border border-gray-200 rounded-lg max-w-full"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        />
        <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
          {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'].map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-gray-800 scale-110' : 'border-gray-300'}`}
              style={{ backgroundColor: c }} />
          ))}
          <select value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))}
            className="text-sm border rounded px-2 py-1">
            <option value={3}>Thin</option>
            <option value={5}>Medium</option>
            <option value={8}>Thick</option>
          </select>
          <button onClick={() => drawImage()} className="text-sm px-3 py-1 bg-gray-200 rounded-lg">Clear</button>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-gray-200 rounded-xl font-medium">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium">Save</button>
        </div>
      </div>
    </div>
  );
}

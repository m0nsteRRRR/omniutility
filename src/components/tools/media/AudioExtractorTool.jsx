import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Music, Upload, Download, Loader, Play, Pause, CheckCircle } from 'lucide-react';

export default function AudioExtractorTool() {
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [format, setFormat] = useState('wav');
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const onDrop = useCallback((accepted) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setDone(false);
    setAudioUrl(null);
    setProgress(0);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.webm', '.mov', '.avi', '.mkv'] },
    multiple: false,
  });

  const extractAudio = async () => {
    if (!file || !videoRef.current) return;
    setExtracting(true);
    setProgress(0);

    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();

      // Progress simulation while decoding
      const progressInterval = setInterval(() => {
        setProgress(p => {
          if (p >= 85) { clearInterval(progressInterval); return p; }
          return p + Math.random() * 5 + 2;
        });
      }, 200);

      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      clearInterval(progressInterval);
      setProgress(90);

      // Encode to WAV
      const wavBlob = audioBufferToWav(audioBuffer);
      const url = URL.createObjectURL(wavBlob);
      setAudioUrl(url);
      setProgress(100);
      setDone(true);
      await audioCtx.close();
    } catch (e) {
      console.error('Audio extraction error:', e);
    } finally {
      setExtracting(false);
    }
  };

  const audioBufferToWav = (buffer) => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * blockAlign;
    const bufferSize = 44 + dataSize;
    const wav = new ArrayBuffer(bufferSize);
    const view = new DataView(wav);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([wav], { type: 'audio/wav' });
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {!file ? (
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <Music size={40} style={{ color: 'var(--accent-magenta)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>
            {isDragActive ? 'Drop your video here!' : 'Drag & drop a video file (MP4, WebM, MOV)'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Extract audio track directly in your browser — no server upload</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            {['MP4', 'WebM', 'MOV', 'AVI', 'MKV'].map(ext => (
              <span key={ext} className="badge badge-purple">{ext}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 24 }}>
          {/* Video preview */}
          <div style={{ marginBottom: 20, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000' }}>
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              style={{ width: '100%', maxHeight: 280, display: 'block' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <Music size={20} style={{ color: 'var(--accent-magenta)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{file.name}</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || 'video'}
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setVideoUrl(null); setDone(false); setAudioUrl(null); }}>
              Change
            </button>
          </div>

          {/* Format selector */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Output Format
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[['wav', 'WAV', 'Lossless PCM'], ['mp3', 'MP3', '320kbps (needs lib)']].map(([v, l, d]) => (
                <button key={v} onClick={() => setFormat(v)} className={`btn btn-sm ${format === v ? 'btn-purple' : 'btn-ghost'}`} style={{ flex: 1 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{l}</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{d}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Progress */}
          {extracting && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Decoding & extracting audio...</span>
                <span style={{ fontSize: 13, color: 'var(--accent-magenta)', fontWeight: 700 }}>{Math.round(progress)}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%`, background: 'var(--grad-purple)' }} />
              </div>
            </div>
          )}

          {/* Audio player */}
          {done && audioUrl && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '16px 18px', borderRadius: 'var(--radius-md)',
              background: 'rgba(224,64,251,0.08)', border: '1px solid rgba(224,64,251,0.3)',
              marginBottom: 20,
            }}>
              <CheckCircle size={18} color="var(--accent-emerald)" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-emerald)', marginBottom: 4 }}>Audio extracted successfully!</p>
                <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} style={{ display: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={togglePlay} style={{ color: 'var(--accent-magenta)' }}>
                    {playing ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{playing ? 'Playing...' : 'Preview extracted audio'}</span>
                </div>
              </div>
              <a href={audioUrl} download={`audio.${format}`} className="btn btn-emerald btn-sm">
                <Download size={14} /> Download WAV
              </a>
            </div>
          )}

          <button
            className="btn btn-lg"
            onClick={extractAudio}
            disabled={extracting}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #7000FF, #E040FB)',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(224,64,251,0.3)',
              border: 'none',
            }}
          >
            {extracting ? <><Loader size={16} className="animate-spin" /> Extracting Audio...</> : <><Music size={16} /> Extract Audio</>}
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useRef, useState, useEffect } from 'react'

const BLOCK_SIZE = 16 // 单位方块的大小
const ISO_ANGLE = Math.PI / 3 // 60度角的等轴投影

const App = () => {
  const canvasRef = useRef(null);
  const [jsonInput, setJsonInput] = useState('[{ "position": [0, 0, 0], "xyz": [4, 4, 4] }]');
  const [error, setError] = useState('');

  const size = BLOCK_SIZE
  const LongEdge = Math.round(Math.sin(ISO_ANGLE) * size); // 斜边1下的长边
  const ShortEdge = Math.round(Math.cos(ISO_ANGLE) * size); // 斜边1下的短边
  console.log('长边', LongEdge, '短边', ShortEdge)

  // 绘制单个方块
  const drawBlock = (ctx, _x, _y) => {
    const x = Math.round(_x);
    const y = Math.round(_y);
    const p1 = [x, y];
    const p2 = [x + LongEdge, y + ShortEdge];
    const p3 = [x + LongEdge, y + ShortEdge + size];
    const p4 = [x, y + 2 * size];
    const p5 = [x - LongEdge, y + ShortEdge + size];
    const p6 = [x - LongEdge, y + ShortEdge];
    const p0 = [x, y + size];

    // 绘制顶面
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.lineTo(p0[0], p0[1]);
    ctx.lineTo(p6[0], p6[1]);
    ctx.closePath()
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.strokeStyle = '#000'
    ctx.stroke()

    // 绘制左面
    ctx.beginPath();
    ctx.moveTo(p6[0], p6[1]);
    ctx.lineTo(p0[0], p0[1]);
    ctx.lineTo(p4[0], p4[1]);
    ctx.lineTo(p5[0], p5[1]);
    ctx.closePath();
    ctx.fillStyle = '#e8e8e8';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.stroke();

    // 绘制右面
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.lineTo(p3[0], p3[1]);
    ctx.lineTo(p4[0], p4[1]);
    ctx.closePath()
    ctx.fillStyle = '#e0e0e0';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }

  // 将3D坐标转换为2D等轴投影坐标
  const isoTo2D = (x, y, z) => {
    const isoX = (x - y) * LongEdge;
    const isoY = (x + y) * ShortEdge - z * size;
    return [isoX, isoY];
  }

  // 绘制整个场景
  const drawScene = (blocks) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false; // 关键设置
    // 部分浏览器需加前缀（如Safari）
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;

    // 计算画布大小
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity

    // 计算所有方块的2D坐标范围
    blocks.forEach(block => {
      const [px, py, pz] = block.position
      const [sx, sy, sz] = block.xyz

      for (let x = 0; x < sx; x++) {
        for (let y = 0; y < sy; y++) {
          for (let z = 0; z < sz; z++) {
            const [isoX, isoY] = isoTo2D(px + x, py + y, pz + z)
            // 考虑方块的所有可见部分，增加边距
            minX = Math.min(minX, isoX - LongEdge);
            minY = Math.min(minY, isoY);
            maxX = Math.max(maxX, isoX + LongEdge + 1);
            maxY = Math.max(maxY, isoY + 2 * ShortEdge + size + 1);
          }
        }
      }
    })

    // 设置画布大小
    canvas.width = maxX - minX
    canvas.height = maxY - minY

    // 清除画布并设置透明背景
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 移动坐标系原点，使所有内容可见
    ctx.translate(-minX, -minY);

    // 按照z轴顺序绘制方块
    blocks.forEach(block => {
      const [px, py, pz] = block.position
      const [sx, sy, sz] = block.xyz

      for (let x = 0; x < sx; x++) {
        for (let y = 0; y < sy; y++) {
          for (let z = 0; z < sz; z++) {
            const [isoX, isoY] = isoTo2D(px + x, py + y, pz + z)
            console.log('绘制方块', [px + x, py + y, pz + z], [isoX, isoY])
            drawBlock(ctx, isoX, isoY)
          }
        }
      }
    })
  }

  const handleJsonSubmit = () => {
    try {
      const blocks = JSON.parse(jsonInput)
      if (!Array.isArray(blocks)) {
        throw new Error('输入必须是数组格式')
      }
      
      blocks.forEach(block => {
        if (!block.position || !block.xyz || 
            !Array.isArray(block.position) || !Array.isArray(block.xyz) ||
            block.position.length !== 3 || block.xyz.length !== 3) {
          throw new Error('每个方块必须包含position和xyz属性，且都是长度为3的数组')
        }
      })

      setError('')
      drawScene(blocks)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>像素方块生成器</h1>
      <div style={{ marginBottom: '20px' }}>
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder='输入JSON格式的方块数据，例如：[{ "position": [0, 0, 0], "xyz": [4, 4, 4] }]'
          style={{ width: '100%', height: '100px' }}
        />
        {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
        <button onClick={handleJsonSubmit} style={{ marginTop: '10px' }}>生成方块</button>
      </div>
      <canvas ref={canvasRef} style={{ border: '1px solid #ccc', width: '500px', 'image-rendering': 'pixelated' }} />
    </div>
  )
}

export default App
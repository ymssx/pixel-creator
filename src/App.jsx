import React, { useRef, useState } from 'react'

const BLOCK_SIZE = 16 // 单位方块的大小
const ISO_ANGLE = Math.PI / 3 // 60度角的等轴投影

const App = () => {
  const canvasRef = useRef(null);
  const [blocks, setBlocks] = useState([{ position: [0, 0, 0], xyz: [4, 4, 4] }]);
  const [error, setError] = useState('');
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(null);

  React.useEffect(() => {
    drawScene(blocks);
  }, [blocks, selectedBlockIndex]);

  const size = BLOCK_SIZE
  const LongEdge = Math.round(Math.sin(ISO_ANGLE) * size); // 斜边1下的长边
  const ShortEdge = Math.round(Math.cos(ISO_ANGLE) * size); // 斜边1下的短边

  let originX = 0;
  let originY = 0;

  // 绘制单个方块
  const drawBlock = (ctx, _x, _y, isSelected = false) => {
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
    ctx.fillStyle = isSelected ? '#a7d8ff' : '#fff'
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
    ctx.fillStyle = isSelected ? '#7ec2fb' : '#e8e8e8';
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
    ctx.fillStyle = isSelected ? '#55aef9' : '#e0e0e0';
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

    // 生成所有方块的坐标信息
    const blockInfos = [];
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
            
            blockInfos.push({
              x: px + x,
              y: py + y,
              z: pz + z,
              isoX,
              isoY
            });
          }
        }
      }
    })

    // 按照x、y、z坐标从小到大排序
    blockInfos.sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      if (a.y !== b.y) return a.y - b.y;
      return a.z - b.z;
    });

    // 设置画布大小
    canvas.width = maxX - minX
    canvas.height = maxY - minY

    // 清除画布并设置透明背景
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 移动坐标系原点，使所有内容可见
    ctx.translate(-minX, -minY);
    originX = -minX;
    originY = -minY;

    // 按顺序绘制可见的方块
    blockInfos.forEach((blockInfo) => {
      drawBlock(ctx, blockInfo.isoX, blockInfo.isoY, JSON.stringify([blockInfo.x, blockInfo.y, blockInfo.z]) === JSON.stringify(selectedBlockIndex));
    });
  }

  const handleAddBlock = () => {
    setBlocks([...blocks, { position: [0, 0, 0], xyz: [1, 1, 1] }]);
  }

  const handleUpdateBlock = (index, field, subIndex, value) => {
    const newBlocks = [...blocks];
    newBlocks[index][field][subIndex] = parseInt(value) || 0;
    setBlocks(newBlocks);
    drawScene(newBlocks);
  }

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX - originX;
    const y = (e.clientY - rect.top) * scaleY - originY;

    // 生成所有方块的坐标信息
    const blockInfos = [];
    blocks.forEach((block) => {
      const [px, py, pz] = block.position;
      const [sx, sy, sz] = block.xyz;

      for (let bx = 0; bx < sx; bx++) {
        for (let by = 0; by < sy; by++) {
          for (let bz = 0; bz < sz; bz++) {
            const [isoX, isoY] = isoTo2D(px + bx, py + by, pz + bz);
            blockInfos.push({
              isoX,
              isoY,
              x: px + bx,
              y: py + by,
              z: pz + bz
            });
          }
        }
      }
    });

    // 按照从外向内的顺序排序（坐标从大到小）
    blockInfos.sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      if (a.y !== b.y) return a.y - b.y;
      return a.z - b.z;
    });

    // 从前向后检查点击是否在方块内
    for (let i = blockInfos.length - 1; i >= 0; i--) {
      const blockInfo = blockInfos[i];
      const isInside = isPointInBlock(
        x,
        y,
        blockInfo.isoX,
        blockInfo.isoY
      );

      if (isInside) {
        setSelectedBlockIndex(JSON.stringify([blockInfo.x, blockInfo.y, blockInfo.z]) === JSON.stringify(selectedBlockIndex) ? null : [blockInfo.x, blockInfo.y, blockInfo.z]);
        return;
      }
    }

    // 如果点击空白处，取消选中
    setSelectedBlockIndex(null);
  };

  // 判断点是否在方块内
  const isPointInBlock = (px, py, blockX, blockY) => {
    // 定义方块的六个顶点
    const p0 = [blockX, blockY + size];
    // 通过内切圆法近似判断是否在方块内
    return (
      Math.pow(px - p0[0], 2) + Math.pow(py - p0[1], 2) <= LongEdge ** 2
    );
  };

  const handleDeleteBlock = (index) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(newBlocks);
    setSelectedBlockIndex(null);
  }

  const renderBlockInputs = (block, index) => {
    return (
      <div key={index} style={{
        background: '#f7f7f7',
        padding: '10px', 
        marginBottom: '12px',
        borderRadius: '4px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>方块 {index + 1}</h3>
          <button 
            onClick={() => handleDeleteBlock(index)}
            style={{
              color: '#ff4d4f',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            删除
          </button>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <div>位置 (position):</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['X', 'Y', 'Z'].map((axis, i) => (
              <input
                key={i}
                type="number"
                value={block.position[i]}
                onChange={(e) => handleUpdateBlock(index, 'position', i, e.target.value)}
                style={{ width: '60px' }}
                placeholder={axis}
              />
            ))}
          </div>
        </div>
        <div>
          <div>尺寸 (xyz):</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['宽', '长', '高'].map((dim, i) => (
              <input
                key={i}
                type="number"
                value={block.xyz[i]}
                onChange={(e) => handleUpdateBlock(index, 'xyz', i, e.target.value)}
                style={{ width: '60px' }}
                placeholder={dim}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>像素方块生成器</h1>
      <div style={{ 
        marginBottom: '20px',
        display: 'flex',
        gap: '20px'
      }}>
        <div style={{ flex: 1, maxWidth: '500px' }}>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {blocks.map((block, index) => renderBlockInputs(block, index))}
          </div>
          <button 
            onClick={handleAddBlock}
            style={{ 
              backgroundColor: '#1890ff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              marginTop: '10px',
              cursor: 'pointer'
            }}
          >
            添加方块
          </button>
          {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
        </div>
        <canvas 
          ref={canvasRef} 
          onClick={handleCanvasClick}
          style={{
            width: '500px',
            margin: 'auto',
            'image-rendering': 'pixelated',
            cursor: 'pointer'
          }} 
        />
      </div>
    </div>
  )
}

export default App
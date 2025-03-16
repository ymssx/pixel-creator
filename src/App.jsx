import React, { useRef, useState } from 'react'

const BLOCK_SIZE = 16 // 单位方块的大小
const ISO_ANGLE = Math.PI / 3 // 60度角的等轴投影

// 颜色加深/变浅的辅助函数
const shadeColor = (color, percent) => {
  const num = parseInt(color.replace("#",""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
};

const App = () => {
  const canvasRef = useRef(null);
  const [blocks, setBlocks] = useState([{ position: [0, 0, 0], xyz: [4, 4, 1], type: '', colors: { top: '#ffffff', left: '#aaaaaa', right: '#e0e0e0' } }]);
  const [lastBlockId, setLastBlockId] = useState(1);
  const [height, setHeight] = useState(10);
  const [error, setError] = useState('');
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(null);
  const [outlineMode, setOutlineMode] = useState('none');
  const isOuterMode = outlineMode === 'outer';

  // 处理方块的显示状态
  let blockStates = new Map();

  React.useEffect(() => {
    drawScene(blocks);
  }, [blocks, selectedBlockIndex, outlineMode, height]);

  const size = BLOCK_SIZE
  const LongEdge = Math.round(Math.sin(ISO_ANGLE) * size); // 斜边1下的长边
  const ShortEdge = Math.round(Math.cos(ISO_ANGLE) * size); // 斜边1下的短边

  let originX = 0;
  let originY = 0;

  // 绘制单个方块
  const drawBlock = (ctx, _x, _y, isSelected = false, blockInfo) => {
    const x = Math.round(_x);
    const y = Math.round(_y);
    const p1 = [x, y];
    const p2 = [x + LongEdge, y + ShortEdge];
    const p3 = [x + LongEdge, y + ShortEdge + height];
    const p4 = [x, y + size + height];
    const p5 = [x - LongEdge, y + ShortEdge + height];
    const p6 = [x - LongEdge, y + ShortEdge];
    const p0 = [x, y + size];

    // 检查相邻方块的函数
    const hasNeighbor = ([dx, dy, dz]) => {
      const key = `${blockInfo.x + dx},${blockInfo.y + dy},${blockInfo.z + dz}`;
      return blockStates.get(key) === true;
    };
    const checkOutline = (p1, p2, checkXYZ) => {
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);

      ctx.lineWidth = 1;
      ctx.strokeStyle = '#000';
      if (isOuterMode && hasNeighbor(checkXYZ[0]) && !hasNeighbor(checkXYZ[1])) {
        ctx.strokeStyle = '#fff';
      }
      if (outlineMode !== 'none') {
        ctx.stroke();
      }
    };

    const fillRect = (p1, p2, p3, p4, color, activeColor) => {
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.lineTo(p3[0], p3[1]);
      ctx.lineTo(p4[0], p4[1]);
      ctx.closePath();
      ctx.fillStyle = isSelected ? activeColor : isOuterMode ? 'white' : color;
      ctx.fill()
    };

    // 绘制顶面
    fillRect(p1, p2, p0, p6, blockInfo.colors?.top || '#fff', '#a7d8ff');
    checkOutline(p1, p2, [[0, -1, 0], [0, -1, 1]]);
    checkOutline(p2, p0, [[1, 0, 0], [0, 0, 1]]);
    checkOutline(p0, p6, [[0, 1, 0], [0, 0, 1]]);
    checkOutline(p6, p1, [[-1, 0, 0], [-1, 0, 1]]);

    // 绘制右面
    fillRect(p0, p2, p3, p4, blockInfo.colors?.right || '#e0e0e0', '#7ec2fb');
    checkOutline(p0, p2, [[0, 0, 1], [1, 0, 0]]);
    checkOutline(p2, p3, [[0, -1, 0], [1, -1, 0]]);
    checkOutline(p3, p4, [[0, 0, -1], [1, 0 , -1]]);
    checkOutline(p4, p0, [[0, 1, 0], [1, 0, 0]]);

    // 绘制左面
    fillRect(p6, p0, p4, p5, blockInfo.colors?.left || '#aaaaaa', '#55aef9');
    checkOutline(p6, p0, [[0, 0, 1], [0, 1, 0]]);
    checkOutline(p0, p4, [[1, 0, 0], [0, 1, 0]]);
    checkOutline(p4, p5, [[0, 0, -1], [0, 1, -1]]);
    checkOutline(p5, p6, [[-1, 0, 0], [-1, 1, 0]]);
  }

  // 将3D坐标转换为2D等轴投影坐标
  const isoTo2D = (x, y, z) => {
    const isoX = (x - y) * LongEdge;
    const isoY = (x + y) * ShortEdge - z * height;
    return [isoX, isoY];
  }

  // 处理键盘事件
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' && selectedBlockIndex) {
        const [x, y, z] = selectedBlockIndex;
        setBlocks([...blocks, { 
          position: [x, y, z], 
          xyz: [1, 1, 1], 
          type: 'delete',
          id: lastBlockId
        }]);
        setLastBlockId(lastBlockId + 1);
        setSelectedBlockIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockIndex, blocks, lastBlockId]);

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

    // 处理方块的显示状态
    blockStates = new Map();
    
    // 按照id排序确保操作顺序
    const sortedBlocks = [...blocks].sort((a, b) => (a.id || 0) - (b.id || 0));
    
    // 生成所有方块的坐标信息
    const blockInfos = [];
    sortedBlocks.forEach(block => {
      const [px, py, pz] = block.position
      const [sx, sy, sz] = block.xyz

      for (let x = 0; x < sx; x++) {
        for (let y = 0; y < sy; y++) {
          for (let z = 0; z < sz; z++) {
            const key = `${px + x},${py + y},${pz + z}`;
            blockStates.set(key, block.type !== 'delete');

            const [isoX, isoY] = isoTo2D(px + x, py + y, pz + z);
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
              isoY,
              type: block.type,
              colors: block.colors,
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
      const key = `${blockInfo.x},${blockInfo.y},${blockInfo.z}`;
      if (blockInfo.type === 'delete' || blockStates.get(key) === false) return;
      drawBlock(ctx, blockInfo.isoX, blockInfo.isoY, JSON.stringify([blockInfo.x, blockInfo.y, blockInfo.z]) === JSON.stringify(selectedBlockIndex), blockInfo);
    });
  }

  const handleAddBlock = () => {
    setBlocks([...blocks, { position: [0, 0, 0], xyz: [1, 1, 1], type: '', colors: { top: '#ffffff', left: '#aaaaaa', right: '#e0e0e0' }, id: lastBlockId }]);
    setLastBlockId(lastBlockId + 1);
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
      if (block.type === 'delete') {
        return;
      }
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
      const key = `${blockInfo.x},${blockInfo.y},${blockInfo.z}`;
      if (blockStates.get(key) === false) {
        continue;
      }

      const bx = blockInfo.isoX;
      const by = blockInfo.isoY;
      const p1 = [bx, by];
      const p2 = [bx + LongEdge, by + ShortEdge];
      const p3 = [bx + LongEdge, by + ShortEdge + height];
      const p4 = [bx, by + size + height];
      const p5 = [bx - LongEdge, by + ShortEdge + height];
      const p6 = [bx - LongEdge, by + ShortEdge];
      const isInside = isPointInQuadrilateral([x, y], [p1, p2, p3, p4, p5, p6]);

      if (isInside) {
        setSelectedBlockIndex(JSON.stringify([blockInfo.x, blockInfo.y, blockInfo.z]) === JSON.stringify(selectedBlockIndex) ? null : [blockInfo.x, blockInfo.y, blockInfo.z]);
        return;
      }
    }

    // 如果点击空白处，取消选中
    setSelectedBlockIndex(null);
  };

  function isPointInQuadrilateral(point, quad) {
    const [x, y] = point;
    let inside = false;
    
    // 遍历四边形的每条边（共4条边，闭合结构）
    for (let i = 0, j = quad.length - 1; i < quad.length; j = i, i++) {
        const [xi, yi] = quad[i];
        const [xj, yj] = quad[j];
        
        // 射线与边的交点判断条件：
        // 1. 点的y坐标在边的y范围之间（异侧）
        // 2. 点在该边的左侧（根据边的方向计算）
        const intersect = ((yi > y) !== (yj > y)) && 
            (x < ((xj - xi) * (y - yi) / (yj - yi) + xi));
        
        if (intersect) inside = !inside;
    }
    return inside;
  }

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
        paddingY: '10px', 
        marginBottom: '24px',
        borderRadius: '4px'
      }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
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
        <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
          <div>类型 (type):</div>
          <div style={{ }}>
            <select
              value={block.type}
              onChange={(e) => {
                const newBlocks = [...blocks];
                newBlocks[index].type = e.target.value;
                setBlocks(newBlocks);
              }}
              style={{
                padding: '4px',
                borderRadius: '4px',
                border: '1px solid #d9d9d9'
              }}
            >
              <option value="">新建</option>
              <option value="delete">删除</option>
            </select>
          </div>
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
        {block.type !== 'delete' && (<div>
          <div>颜色设置:</div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
            <div>
              <div>顶面</div>
              <input
                type="color"
                value={block.colors?.top || '#ffffff'}
                onChange={(e) => {
                  const newBlocks = [...blocks];
                  const topColor = e.target.value;
                  // 计算右面和左面的颜色（逐渐加深）
                  const leftColor = shadeColor(topColor, -35);  // 比顶面深35%
                  const rightColor = shadeColor(topColor, -20); // 比顶面深20%
                  newBlocks[index].colors = { 
                    ...newBlocks[index].colors, 
                    top: topColor,
                    right: rightColor,
                    left: leftColor
                  };
                  setBlocks(newBlocks);
                }}
              />
            </div>
            <div>
              <div>右面</div>
              <input
                type="color"
                value={block.colors?.right || '#e0e0e0'}
                onChange={(e) => {
                  const newBlocks = [...blocks];
                  newBlocks[index].colors = { ...newBlocks[index].colors, right: e.target.value };
                  setBlocks(newBlocks);
                }}
              />
            </div>
            <div>
              <div>左面</div>
              <input
                type="color"
                value={block.colors?.left || '#aaaaaa'}
                onChange={(e) => {
                  const newBlocks = [...blocks];
                  newBlocks[index].colors = { ...newBlocks[index].colors, left: e.target.value };
                  setBlocks(newBlocks);
                }}
              />
            </div>
          </div>
        </div>)}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>像素方块生成器</h1>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ marginRight: '10px' }}>轮廓显示模式：</label>
          <select 
            value={outlineMode}
            onChange={(e) => setOutlineMode(e.target.value)}
            style={{
              padding: '4px',
              borderRadius: '4px',
              border: '1px solid #d9d9d9'
            }}
          >
            <option value="full">展示完整轮廓</option>
            <option value="outer">只展示外轮廓</option>
            <option value="none">完全不展示轮廓</option>
          </select>
        </div>
        <div>
          <label style={{ marginRight: '10px' }}>方块厚度：</label>
          <input value={height} onChange={(e) => setHeight(Number(e.target.value))}></input>
        </div>
      </div>
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
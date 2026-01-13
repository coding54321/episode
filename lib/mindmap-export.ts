import { MindMapNode } from '@/types';

/**
 * 마인드맵 노드 데이터를 SVG로 변환
 */
export function generateMindMapSVG(nodes: MindMapNode[]): string {
  if (nodes.length === 0) {
    return '';
  }

  // 노드 인덱스 맵
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // 모든 노드의 경계 계산
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(node => {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.x > maxX) maxX = node.x;
    if (node.y > maxY) maxY = node.y;
  });

  // 여백 추가
  const padding = 100;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = maxX - minX;
  const height = maxY - minY;

  // 노드 스타일 정의
  const getNodeStyle = (node: MindMapNode) => {
    if (node.id === 'center') {
      return {
        fill: '#3b82f6',
        stroke: '#2563eb',
        textColor: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        rx: 20,
        width: 160,
        height: 60,
      };
    }

    switch (node.nodeType) {
      case 'category':
        return {
          fill: '#8b5cf6',
          stroke: '#7c3aed',
          textColor: '#ffffff',
          fontSize: 16,
          fontWeight: '600',
          rx: 16,
          width: 140,
          height: 50,
        };
      case 'experience':
        return {
          fill: '#ec4899',
          stroke: '#db2777',
          textColor: '#ffffff',
          fontSize: 14,
          fontWeight: '500',
          rx: 14,
          width: 120,
          height: 45,
        };
      case 'episode':
        return {
          fill: '#f59e0b',
          stroke: '#d97706',
          textColor: '#ffffff',
          fontSize: 13,
          fontWeight: '500',
          rx: 12,
          width: 110,
          height: 40,
        };
      default:
        return {
          fill: '#10b981',
          stroke: '#059669',
          textColor: '#ffffff',
          fontSize: 12,
          fontWeight: 'normal',
          rx: 10,
          width: 100,
          height: 35,
        };
    }
  };

  // 텍스트 줄바꿈 처리
  const wrapText = (text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      // 대략적인 글자 폭 계산 (폰트 크기의 0.6배)
      const testWidth = testLine.length * 8;

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    // 최대 2줄까지만
    return lines.slice(0, 2);
  };

  // SVG 연결선 생성
  const lines = nodes
    .filter(node => node.parentId)
    .map(node => {
      const parent = nodeMap.get(node.parentId!);
      if (!parent) return '';

      const isSharedLine = node.isShared || parent.isShared;
      return `<line x1="${parent.x - minX}" y1="${parent.y - minY}" x2="${node.x - minX}" y2="${node.y - minY}" stroke="${isSharedLine ? '#22c55e' : '#cbd5e1'}" stroke-width="${isSharedLine ? 3 : 2}" stroke-linecap="round"/>`;
    })
    .join('\n');

  // SVG 노드 생성
  const nodeElements = nodes.map(node => {
    const style = getNodeStyle(node);
    const x = node.x - minX - style.width / 2;
    const y = node.y - minY - style.height / 2;

    // 라벨 텍스트 처리
    const labelText = typeof node.label === 'string' ? node.label : '노드';
    const lines = wrapText(labelText, style.width - 20);

    // 텍스트 라인들
    const textLines = lines.map((line, index) => {
      const dy = index === 0 ? 0 : 16;
      const yOffset = lines.length === 1 ? style.height / 2 : (style.height / 2 - 8 + index * 16);
      return `<tspan x="${x + style.width / 2}" dy="${dy}" y="${y + yOffset}">${escapeXml(line)}</tspan>`;
    }).join('');

    return `
      <g>
        <rect x="${x}" y="${y}" width="${style.width}" height="${style.height}" rx="${style.rx}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="2"/>
        <text x="${x + style.width / 2}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${style.fontSize}" font-weight="${style.fontWeight}" fill="${style.textColor}">
          ${textLines}
        </text>
      </g>
    `;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f9fafb"/>
  ${lines}
  ${nodeElements}
</svg>`;
}

/**
 * XML 특수 문자 이스케이프
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * SVG를 PNG 이미지로 변환
 */
export async function convertSVGToPNG(svgString: string, scale: number = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert to PNG'));
        }
      }, 'image/png', 1.0);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG'));
    };

    img.src = url;
  });
}

/**
 * SVG를 PDF로 변환
 */
export async function convertSVGToPDF(svgString: string, projectName: string): Promise<void> {
  const { jsPDF } = await import('jspdf');

  // SVG를 PNG로 변환
  const pngBlob = await convertSVGToPNG(svgString, 3); // 고해상도
  const pngUrl = URL.createObjectURL(pngBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // A4 가로형 (297mm x 210mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [297, 210],
      });

      const pageWidth = 297;
      const pageHeight = 210;
      const imgAspect = img.width / img.height;
      const pageAspect = pageWidth / pageHeight;

      let imgWidth, imgHeight, xOffset, yOffset;

      if (imgAspect > pageAspect) {
        // 이미지가 더 넓음 - 너비 기준
        imgWidth = pageWidth;
        imgHeight = pageWidth / imgAspect;
        xOffset = 0;
        yOffset = (pageHeight - imgHeight) / 2;
      } else {
        // 이미지가 더 높음 - 높이 기준
        imgHeight = pageHeight;
        imgWidth = pageHeight * imgAspect;
        xOffset = (pageWidth - imgWidth) / 2;
        yOffset = 0;
      }

      pdf.addImage(pngUrl, 'PNG', xOffset, yOffset, imgWidth, imgHeight, undefined, 'FAST');
      pdf.save(`${projectName}_${new Date().toISOString().split('T')[0]}.pdf`);

      URL.revokeObjectURL(pngUrl);
      resolve();
    };

    img.onerror = () => {
      URL.revokeObjectURL(pngUrl);
      reject(new Error('Failed to load PNG for PDF'));
    };

    img.src = pngUrl;
  });
}

/**
 * 마인드맵을 이미지로 다운로드
 */
export async function downloadMindMapAsImage(nodes: MindMapNode[], projectName: string): Promise<void> {
  const svg = generateMindMapSVG(nodes);
  const blob = await convertSVGToPNG(svg, 3); // 고해상도

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}_${new Date().toISOString().split('T')[0]}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 마인드맵을 PDF로 다운로드
 */
export async function downloadMindMapAsPDF(nodes: MindMapNode[], projectName: string): Promise<void> {
  const svg = generateMindMapSVG(nodes);
  await convertSVGToPDF(svg, projectName);
}

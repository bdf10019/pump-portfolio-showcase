// All diagrams are original, static illustrations—not live equipment readings.
const svg=(label:string,body:string)=>`<svg viewBox="0 0 220 220" role="img" aria-label="${label}" class="panel-diagram"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const arrow=(y:number)=>`<path d="M110 ${y}v18m-5-5 5 5 5-5"/>`;
const box=(y:number,label:string)=>`<rect x="47" y="${y}" width="126" height="34" rx="3"/><text x="110" y="${y+22}" text-anchor="middle" stroke="none" fill="currentColor">${label}</text>`;
export const PANELS=[
 {eyebrow:'01 / PUMP',title:'同一台水泵',body:'EQ-PUMP-001<br>同一設備情境，說明三種工作。',caption:'原色自製模型',diagram:'<div class="pump-slot"></div>'},
 {eyebrow:'02 / WATER LOOP',title:'看懂供水與回水',body:'先看完整水路，再理解觀察訊號。<br>箭頭只表示方向。',caption:'閉式循環方向示意',diagram:svg('水泵、供水、換熱設備與回水形成閉式循環',`<path d="M62 146V48h112v108h-45M91 156H62"/><circle cx="110" cy="156" r="19"/><path d="m93 42 9 6-9 6m87 44-6 9-6-9m-91 52-9 6 9 6"/><rect x="149" y="82" width="50" height="40"/><path d="m156 90 10 23 8-23 8 23 9-23"/><g stroke="none" fill="currentColor"><text x="110" y="31" text-anchor="middle">供水</text><text x="110" y="194" text-anchor="middle">水泵 · 回水</text></g>`)},
 {eyebrow:'03 / VIBRATION',title:'振動持續',body:'感測器 → 軸承待查<br>這是待查線索，不是故障確診。',caption:'感測來源／軸承待查',diagram:`<div class="pump-slot"></div>${svg('振動波形為待查線索，不是實測振幅',`<path d="M24 126h25l8-25 13 53 14-76 14 95 14-66 10 31 12-12h62"/><circle cx="176" cy="63" r="19"/><circle cx="176" cy="63" r="9"/><path d="M153 83l-21 18"/>`)}`},
 {eyebrow:'04 / TEMPERATURE',title:'溫度偏高',body:'負載／趨勢／歷史一起判讀。<br>不顯示虛構實測數字。',caption:'運轉條件與趨勢待查',diagram:`<div class="pump-slot"></div>${svg('溫度計與趨勢示意，不顯示實測數值',`<path d="M47 52a9 9 0 0 1 18 0v84a22 22 0 1 1-18 0Z"/><path d="M56 79v66m15-63h8m-8 17h8m-8 17h8M107 160h90M110 160V72m7 63 20-11 19 7 30-28"/>`)}`},
 {eyebrow:'05 / MODEL REVIEW',title:'先判讀，再複核',body:'合成觀察 → 保留判讀 → 人工確認。<br>模型品質仍有已揭露限制。',caption:'作品一：判讀與人工複核',diagram:svg('觀察紀錄經模型判讀，再由人複核',`${box(22,'觀察紀錄')}${arrow(60)}${box(82,'模型判讀')}${arrow(120)}${box(142,'人工複核')}`)},
 {eyebrow:'06 / APPROVAL',title:'操作前，先核准',body:'01 權限檢查<br>02 人工核准<br>03 依核准執行',caption:'作品二：核准後執行',diagram:svg('檢查權限、人工核准、依核准執行',`${box(22,'權限檢查')}${arrow(60)}${box(82,'人工核准')}${arrow(120)}${box(142,'核准執行')}`)},
 {eyebrow:'07 / SOURCE DOCUMENT',title:'整理，回到來源',body:'維修檢查單／合成文件<br>來源對照 → 修正 → 匯出',caption:'作品三：整理與來源對照',diagram:svg('文件來源、修正與匯出示意',`<path d="M55 27h66l26 27v103H55Z M121 27v27h26M70 73h57M70 88h46M70 103h36"/><circle cx="146" cy="134" r="24"/><path d="m163 152 20 21m-48-39 8 8 16-18"/><text x="110" y="204" text-anchor="middle" stroke="none" fill="currentColor">對照 → 修正 → 匯出</text>`)},
 {eyebrow:'08 / EVIDENCE',title:'可追查，可複核',body:'判讀紀錄／核准歷史／文件來源。<br>三作品獨立，不宣稱自動串接。',caption:'證據目錄／不控制設備',diagram:svg('三種獨立證據',`<path d="M39 43v128m0-116h21m-21 53h21m-21 53h21"/><g>${box(38,'判讀紀錄')}${box(91,'核准歷史')}${box(144,'文件來源')}</g>`)},
] as const;
export function panelAt(index:number){
 const p=PANELS[index];if(!p)throw new RangeError('Unknown reel panel');
 return `<article class="split-panel"><div class="panel-copy"><small>${p.eyebrow}</small><h3>${p.title}</h3><p>${p.body}</p></div><figure class="panel-figure"><div class="diagram-stage">${p.diagram}</div><figcaption>${p.caption}</figcaption></figure></article>`;
}

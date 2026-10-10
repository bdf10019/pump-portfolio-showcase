# B 影片入口本機藝術字型

來源：[霞鶩文楷 TC](https://github.com/lxgw/LxgwWenkaiTC)，原檔 `fonts/TTF/LXGWWenKaiTC-Regular.ttf`；版本 1.522（2026-03-17）。來源 main 於 2026-10-09 查得 commit `9f16d01c95d9005e508a51168173b5be3119ed83`。下載時的原檔 SHA-256：`B1A0795862C1415BF3F393EA50B2A4EA6275012CF5BAD3F94FEEB1222F555731`。

本頁交付的是字元子集，不是完整字型；以現有 FontTools 4.63.0 產生 WOFF，未安裝新套件。326 個字元映射、114,368 bytes，覆蓋 B HTML、播放文字、八段契約與圖示內全部現有漢字。沒有全繁體漢字涵蓋保證；未來改文字必須重新產生子集。CSS 名稱為 `Pump WenKai`，備援楷體／宋體。

```powershell
./scripts/subset-reel-font.ps1 -SourceFont <合法下載的原 TTF 路徑>
```

完整授權見同目錄 `OFL.txt`。原字型及子集依 SIL OFL 1.1 發布，不單獨出售字型，不宣稱原作者替本作品背書。頁面所有字型請求指向本機 `/assets/fonts/`，沒有遠端 Google Fonts／CDN 請求。這不是網站全部網路流量的稽核保證。

字型轉換提示 `meta NOT subset ... dropped` 是 FontTools 移除不支援的 meta 表；OFL 全文另檔與字型 name 授權資訊保留。原 TTF 僅供本機轉換，未放入交付 public 目錄。

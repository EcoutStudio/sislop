export const originalAlbumArt='/assets/diamantado-960.webp';
export function selectAlbumArt(records){
 const covers=records.filter(r=>r.kind==='media'&&r.category==='Capa do álbum'&&r.title.toUpperCase().includes('DIAMANTADO')&&r.imagePath);
 return covers.find(r=>r.imageSource==='upload')||covers[0];
}

// Official artwork supplied by the band. Uploaded replacements take precedence.
export const diamantadoCoverId='21e7b34c-6273-5526-bf5c-79c2f209d4fb';
export function artworkFor(row){
 if(row.asset_id)return {imagePath:'/media-assets/'+row.asset_id,imageSource:'upload'};
 if(row.id===diamantadoCoverId)return {imagePath:'/assets/diamantado-960.webp',imageSource:'bundled'};
 return {};
}

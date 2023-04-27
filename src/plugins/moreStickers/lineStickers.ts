/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { LineSticker, LineStickerPack, Sticker, StickerPack } from "./types";
import { corsFetch } from "./utils";

/**
 * Convert LineStickerPack id to StickerPack id
 *
 * @param id The id to convert.
 * @returns {string} The converted id.
 */

function toStickerPackId(id: string): string {
    return "Vencord-MoreStickers-Line-" + id;
}

/**
  * Convert LineSticker to Sticker
  *
  * @param {LineSticker} s The LineSticker to convert.
  * @return {Sticker} The sticker.
  */
export function convertSticker(s: LineSticker): Sticker {
    return {
        id: s.id,
        url: s.staticUrl,
        title: s.id,
        stickerPackId: toStickerPackId(s.stickerPackId)
    };
}

/**
  * Convert LineStickerPack to StickerPack
  *
  * @param {LineStickerPack} sp The LineStickerPack to convert.
  * @return {StickerPack} The sticker pack.
  */
export function convert(sp: LineStickerPack): StickerPack {
    return {
        id: toStickerPackId(sp.id),
        title: sp.title,
        author: sp.author,
        logo: convertSticker(sp.mainImage),
        stickers: sp.stickers.map(convertSticker)
    };
}

/**
  * Get stickers from LINE
  *
  * @param {string} id The id of the sticker pack.
  * @return {Promise<LineStickerPack>} The sticker pack.
  */
export async function getStickerPack(id: string): Promise<LineStickerPack> {
    const res = await corsFetch(`https://store.line.me/stickershop/product/${id}/en`);
    const html = await res.text();

    const doc = new DOMParser().parseFromString(html, "text/html");

    const stickers =
        [...doc.querySelectorAll(".FnStickerPreviewItem")]
            .map(x => JSON.parse((x as HTMLElement).dataset.preview ?? "null"))
            .filter(x => x !== null)
            .map(x => ({ ...x, stickerPackId: id })) as LineSticker[];

    const mainImage = JSON.parse((doc.querySelector("[ref=mainImage]") as HTMLElement)?.dataset?.preview ?? "null") as LineSticker;
    const stickerPack = {
        title: doc.querySelector("[data-test=sticker-name-title]")?.textContent ?? "null",
        author: {
            name: doc.querySelector("[data-test=sticker-author]")?.textContent ?? "null",
            url: "https://store.line.me/" + (doc.querySelector("[data-test=sticker-author]")?.getAttribute("href") ?? "null")
        },
        id,
        mainImage,
        stickers
    } as LineStickerPack;

    return stickerPack;
}

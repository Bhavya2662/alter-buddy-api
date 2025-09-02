// import HMS from "@100mslive/server-sdk";
import { v4 as uuid } from "uuid";

class HMSServices {
     hms: any;
     constructor() {
          // this.hms = new HMS(
          //      process.env.REACT_APP_100ms_SDK_KEY || "66a096cfadd12651a02f8b60",
          //      process.env.REACT_APP_100ms_SDK_SECRET || "MUSTuzogNeTMRhdxUchctGsjOG-tFpyjqthKMY91lzuAdWFpy5zDRARhmu37443_4YxktoBcNd1y0fFWByZzr3LmDEJo0QiVRiiUe_wJAQgJlIqOoqSln8iZp7I5aDUSvYyKZCSXDO-ckV_-omsOHyri9sBfKHY4ue-bx-f-PSI="
          // );
     }

     public getRoomConfigs = async () => {
          const roomOptions: any = {
               description: "test room 2",
               name: uuid(),
               recording_info: {
                    enabled: true,
               },
               region: "in",
               template_id: "66a096efad8abf3a324d273a",
          };
          const roomId = await this.hms.rooms.create(roomOptions);
          const roomCode = await this.hms.roomCodes.create(roomId.id);
          return roomCode;
     };
}

export const HMSService = new HMSServices();

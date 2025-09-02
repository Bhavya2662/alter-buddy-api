import moment from "moment-timezone";

export const isWithinNextMinutesIST = (
     slotTime: string,
     minutes: number
): boolean => {
     // Get current time in UTC
     const currentISTTime = moment().tz("Asia/Kolkata"); // Convert current time to IST

     // Parse slot time (assuming it's in "HH:mm" format)
     const [hours, mins] = slotTime.split(":").map(Number);

     // Create a moment object for the slot time on the current date in IST
     const slotISTDate = moment.tz("Asia/Kolkata").set({
          hour: hours,
          minute: mins,
          second: 0,
          millisecond: 0,
     });

     // Calculate the difference in minutes between the current IST time and the slot time
     const timeDifference = slotISTDate.diff(currentISTTime, "minutes");

     // Return true if the slot time is within the next 'minutes'
     return timeDifference > 0 && timeDifference <= minutes;
};

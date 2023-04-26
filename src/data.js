import { fromLbs, toMeters } from "./weight";

export const characters = {
  Bex: {
    color: "#483465",
    weighingsByStep: {
      0: {
        url: "https://twitter.com/EBCArtWork/status/1646336098170466304/photo/2",
        height: toMeters(4, 10),
        weight: fromLbs(90),
      },
      1: {
        url: "https://twitter.com/EBCArtWork/status/1646336098170466304/photo/3",
        height: toMeters(5, 4),
        weight: fromLbs(119),
      },
      2: {
        url: "https://twitter.com/EBCArtWork/status/1646336098170466304/photo/4",
        height: toMeters(6, 0),
        weight: fromLbs(172),
      },
      3: {
        url: "https://twitter.com/EBCArtWork/status/1646671962759106560/photo/1",
        height: toMeters(7, 0),
        weight: fromLbs(261),
      },
      4: {
        url: "https://twitter.com/EBCArtWork/status/1649228306745802753/photo/1",
        height: toMeters(8, 0),
        weight: fromLbs(372),
      },
      5: {
        url: "https://twitter.com/EBCArtWork/status/1650655470036856832/photo/1",
        height: toMeters(9, 0),
        weight: fromLbs(513),
      },
    },
  },
};

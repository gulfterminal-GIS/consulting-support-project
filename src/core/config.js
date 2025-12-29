// Application-wide configuration constants
export const CONFIG = {
  // ArcGIS API Configuration
  ARCGIS_API_KEY: "AAPK67a9b2041fcc449d90ab91d6bae4a156HTaBtzlYSKLe8L-zBuIgrSGvxOopzVQEtdwVrlp6RKN9Rrq_y2qkTax7Do1cHqm9",
  
  // Map Configuration
  DEFAULT_BASEMAP: "hybrid",
  DEFAULT_CENTER: [45.0792, 23.8859], // Center of Saudi Arabia
  DEFAULT_ZOOM: 6,
  
  // Regional Planners Data Configuration
  REGIONAL_PLANNERS: [
    {
      name: "Riyadh",
      nameAr: "الرياض",
      folder: "Riyadh_Planners",
      files: [
        "planner_1.geojson",
        "planner_45.geojson",
        "planner_75.geojson",
        "planner_110.geojson",
        "planner_north_part_923.geojson",
        "planner_south_part_923.geojson"
      ]
    },
    {
      name: "Mecca",
      nameAr: "مكة المكرمة",
      folder: "Mecca",
      files: ["planner_6928.geojson"]
    },
    {
      name: "Madinah",
      nameAr: "المدينة المنورة",
      folder: "AL Madinah AL Munawwarah",
      files: [
        "planner_2_d.geojson",
        "planner_33_b.geojson",
        "planner_33_d.geojson",
        "planner_75.geojson",
        "planner_d.geojson",
        "planner_g.geojson",
        "planner_kh.geojson",
        "planner_s.geojson"
      ]
    },
    {
      name: "Qassim",
      nameAr: "القصيم",
      folder: "Al-Qassim",
      files: [
        "planner_91.geojson",
        "planner_4602.geojson",
        "planner_4603.geojson",
        "planner_4604.geojson",
        "planner_4605.geojson",
        "planner_4606.geojson",
        "planner_4607.geojson",
        "planner_4608.geojson",
        "planner_4609.geojson",
        "planner_4832.geojson"
      ]
    },
    {
      name: "Sharqia",
      nameAr: "الشرقية",
      folder: "Sharqia",
      files: ["planner_3.geojson"]
    },
    {
      name: "Aseer",
      nameAr: "عسير",
      folder: "Aseer",
      files: [
        "planner_20_proposal_01.geojson",
        "planner_20_proposal_02.geojson",
        "final_planner_27.geojson",
        "planner_30.geojson",
        "final_planner_31.geojson",
        "planner_46_b.geojson",
        "planner_66.geojson",
        "total_parcels_planners_350.geojson"
      ]
    },
    {
      name: "Tabuk",
      nameAr: "تبوك",
      folder: "Tabuk",
      files: ["planner_7.geojson"]
    },
    {
      name: "Najran",
      nameAr: "نجران",
      folder: "Najran",
      files: [
        "planner_5.geojson",
        "planner_70.geojson",
        "planner_153.geojson"
      ]
    }
  ]
};
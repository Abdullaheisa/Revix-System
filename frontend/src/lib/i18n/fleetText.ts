export function getFleetText(isRtl: boolean) {
  return {
    viewer: {
      loading: isRtl ? "جاري تحميل مجسم السيارة ثلاثي الأبعاد..." : "Loading 3D vehicle model...",
      hint: isRtl
        ? "اسحب لتدوير السيارة 360° • اضغط على أي جزء لتحديده أو إلغاء تحديده"
        : "Drag to rotate 360° • Click any part to select or deselect",
      selected: isRtl ? "محدد" : "Selected",
      minor: isRtl ? "خدش" : "Minor",
      major: isRtl ? "ضرر" : "Major",
    },
    tabs: {
      overview: isRtl ? "نظرة عامة" : "Overview",
      insurance: isRtl ? "التأمين" : "Insurance",
      pricing: isRtl ? "شرائح الأسعار" : "Pricing Tiers",
      maintenance: isRtl ? "الصيانة" : "Maintenance",
      inspections: isRtl ? "الفحص 3D والحوادث" : "3D Inspection & Accidents",
      timeline: isRtl ? "السجل والعداد" : "Odometer & History",
    },
    inspections: {
      mapTitle: isRtl ? "المجسم ثلاثي الأبعاد للأضرار والحوادث" : "3D Vehicle Damage Map",
      selectedCount: (count: number) => (isRtl ? `تم تحديد ${count} أجزاء` : `${count} selected`),
      formTitle: isRtl ? "تسجيل فحص جديد" : "Record Inspection",
      typeLabel: isRtl ? "نوع الفحص" : "Type",
      odometerLabel: isRtl ? "قراءة العداد *" : "Odometer *",
      odometerPlaceholder: isRtl ? "مثال: 12500" : "e.g. 12500",
      customerLabel: isRtl ? "اسم العميل" : "Customer Name",
      customerPlaceholder: isRtl ? "مثال: أحمد محمد" : "e.g. Ahmed Mohamed",
      bookingLabel: isRtl ? "رقم الحجز" : "Booking Ref",
      bookingPlaceholder: isRtl ? "مثال: BK-1042" : "e.g. BK-1042",
      damagedPartsLabel: isRtl ? "الأجزاء المتضررة" : "Damaged Parts",
      clearAll: isRtl ? "مسح الكل" : "Clear all",
      partPickerPlaceholder: isRtl
        ? "اضغط على السيارة 3D أو اختر من القائمة..."
        : "Click 3D car or choose part...",
      severityLabel: isRtl ? "شدة الضرر" : "Severity",
      repairCostLabel: isRtl ? "تكلفة الإصلاح" : "Repair Cost",
      damageDescPlaceholder: isRtl ? "وصف الضرر..." : "Damage description...",
      accidentCheckbox: isRtl ? "يوجد حادث مسجّل" : "Accident Involved",
      accidentPlaceholder: isRtl ? "تفاصيل الحادث..." : "Accident details...",
      saveBtn: isRtl ? "حفظ الفحص" : "Save Inspection",
      savingBtn: isRtl ? "جاري الحفظ..." : "Saving...",
      savedToast: isRtl ? "تم حفظ الفحص وتحديث المجسم 3D والعداد" : "Inspection & 3D damage saved",
      tableTitle: isRtl ? "سجل الفحوصات والأضرار المسجلة" : "Recorded Inspections & Damages",
      tableEmpty: isRtl
        ? "لا توجد فحوصات مسجلة لهذه السيارة حتى الآن."
        : "No inspections recorded for this vehicle yet.",
      cleanLabel: isRtl ? "سليمة" : "Clean",
      yesLabel: isRtl ? "نعم" : "Yes",
      kmUnit: isRtl ? "كم" : "km",
      colDate: isRtl ? "التاريخ" : "Date",
      colType: isRtl ? "النوع" : "Type",
      colCustomerRef: isRtl ? "العميل / الحجز" : "Customer / Ref",
      colOdometer: isRtl ? "العداد" : "Odometer",
      colParts: isRtl ? "الأجزاء المتضررة" : "Damaged Parts",
      colAccident: isRtl ? "الحادث" : "Accident",
    },
    insuranceCompanies: {
      title: isRtl ? "دليل شركات التأمين" : "Insurance Companies",
      subtitle: isRtl
        ? "إدارة شركات التأمين وربطها بوثائق تأمين السيارات."
        : "Manage insurance providers linked to vehicle policies.",
      addBtn: isRtl ? "إضافة شركة تأمين" : "Add Insurance Company",
      empty: isRtl
        ? "لا توجد شركات تأمين مضافة حتى الآن. أضف أول شركة تأمين للبدء."
        : "No insurance companies added yet. Add your first provider to start.",
      deleteBtn: isRtl ? "حذف" : "Delete",
      confirmDelete: (name: string) =>
        isRtl ? `هل تريد حذف شركة التأمين "${name}"؟` : `Delete insurance company "${name}"?`,
      modalTitle: isRtl ? "إضافة شركة تأمين" : "Add Insurance Company",
      nameLabel: isRtl ? "اسم شركة التأمين *" : "Company Name *",
      namePlaceholder: isRtl ? "مثال: مصر للتأمين، أليانز..." : "e.g. Misr Insurance, Allianz...",
      contactLabel: isRtl ? "مسؤول التواصل" : "Contact Person",
      contactPlaceholder: isRtl ? "مثال: أحمد محمد" : "e.g. Ahmed Mohamed",
      phoneLabel: isRtl ? "رقم الهاتف" : "Phone",
      phonePlaceholder: isRtl ? "مثال: +20 100 000 0000" : "e.g. +20 100 000 0000",
      emailLabel: isRtl ? "البريد الإلكتروني" : "Email",
      emailPlaceholder: isRtl ? "مثال: claims@insurance.com" : "e.g. claims@insurance.com",
      addressLabel: isRtl ? "العنوان" : "Address",
      addressPlaceholder: isRtl ? "مثال: القاهرة، مدينة نصر" : "e.g. Cairo, Nasr City",
      cancel: isRtl ? "إلغاء" : "Cancel",
      save: isRtl ? "حفظ" : "Save",
      saving: isRtl ? "جاري الحفظ..." : "Saving...",
      nameRequiredError: isRtl ? "يرجى كتابة اسم شركة التأمين." : "Insurance company name is required.",
      createFailedError: isRtl ? "تعذر إضافة شركة التأمين." : "Failed to create insurance company.",
      colCompany: isRtl ? "اسم الشركة" : "Company",
      colContact: isRtl ? "مسؤول التواصل" : "Contact",
      colPhone: isRtl ? "الهاتف" : "Phone",
      colEmail: isRtl ? "البريد الإلكتروني" : "Email",
      colAddress: isRtl ? "العنوان" : "Address",
      colActions: isRtl ? "الإجراءات" : "Actions",
    },
  };
}

export interface QueueTicket {
  id: number;
  number: number;
  prefix: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  doctorId: number;
  doctorName: string;
  patientName?: string;
  createdAt: string;
}

export interface Doctor {
  id: number;
  fullName: string;
  specialty?: string;
  prefix?: string;
}

export interface JournalEntry {
  id: number;
  date: string;
  type: string;
  patient_name?: string;
  amount: number;
  discount?: number;
  payment_type?: string;
  commission_rate?: number;
  description?: string;
  category?: string;
  doctor_name?: string;
  item_name?: string;
  room_name?: string;
  status?: string;
  created_by?: string;
  _group?: string | null;
  _children?: JournalEntry[];
  _groupTotal?: number;
  _groupCount?: number;
}

export interface LabTestTemplate {
  id: number;
  testName: string;
  category?: string;
  price?: number;
  fieldsJson?: string;
  fields?: LabTestTemplateField[];
  name?: string;
  unit?: string;
  min?: number;
  max?: number;
  minM?: number;
  maxM?: number;
  minF?: number;
  maxF?: number;
}

export interface LabTestTemplateField {
  name: string;
  type?: string;
  formula?: string;
  options?: string;
  unit?: string;
  min?: number;
  max?: number;
  minM?: number;
  maxM?: number;
  minF?: number;
  maxF?: number;
}

export interface LabTest {
  id: number;
  laboratoryId?: string;
  patientId: number;
  patientName: string;
  testName: string;
  status: 'pending' | 'sampled' | 'processing' | 'in_progress' | 'ready';
  resultJson?: string;
  resultValue?: string;
  gender?: string;
  isUrgent?: number;
  createdAt?: string;
  completedAt?: string;
  phone?: string;
  doctorName?: string;
}

export interface PrintResultField {
  name: string;
  value?: string;
  flag?: string;
  unit?: string;
  min?: string | number;
  max?: string | number;
}

export interface StaffMember {
  id: number;
  fullName: string;
  specialty?: string;
  phone?: string;
  role: string;
  salary?: number;
  hiredAt?: string;
  isActive?: number;
}

export interface AppPermission {
  feature_name: string;
}

export interface ProfileWithRole {
  id: string;
  clinic_id: string | number | null;
  role?: string;
  role_id?: number;
  [key: string]: unknown;
}

export interface ReceptionHandle {
  openDoctorSelect: () => void;
  openCheckPreview: () => void;
  handleSaveAndPrint: () => void;
  handleSaveOnly: () => void;
  focusServiceSearch: () => void;
  isCheckPreviewOpen: () => boolean;
}

export interface ArchiveRecord {
  id: number;
  type: string;
  description?: string;
  amount?: number;
  paymentType?: string;
  createdAt?: string;
  fullName?: string;
  phone?: string;
  doctorName?: string;
  serviceName?: string;
  [key: string]: unknown;
}

export interface ClinicService {
  id: number;
  name: string;
  price: number;
  isActive?: number;
  orderIndex?: number;
  category?: string;
  duration?: number;
}

export interface ClinicDoctor {
  id: number;
  fullName: string;
  specialty?: string;
  isActive?: number;
  prefix?: string;
  phone?: string;
  role?: string;
  commission_rate?: number;
}

export interface ClinicPermission {
  id?: number;
  role: string;
  feature: string;
  canAccess: number;
}

export interface AuditLog {
  id: number;
  action: string;
  userId?: string;
  userName?: string;
  details?: string;
  reason?: string;
  createdAt?: string;
  timestamp?: string;
  tableName?: string;
}

export interface LabPatient {
  id: number;
  fullName: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
}

export interface LabResultData {
  fields: Array<LabTestTemplateField & { value?: string }>;
  __historicalFields?: Array<LabTestTemplateField & { value?: string }>;
  legacy?: string;
}

export interface TemplateFieldDraft extends LabTestTemplateField {
  id: number;
  panicL?: string;
  panicH?: string;
}

export type LabResultMap = { [key: string]: string | number | LabTestTemplateField[] };

export interface PrinterInfo {
  name: string;
  displayName?: string;
}

export interface SelectedServiceItem extends ClinicService {
  quantity: number;
  doctorId?: number;
}

export interface ExistingPatient {
  id: number;
  fullName: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  source?: string;
  activeRoomId?: number;
  roomName?: string;
}

export interface ShiftRecord {
  id: number;
  type: string;
  status: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface ShiftSummary {
  totalAmount?: number;
  count?: number;
  cash?: number;
  card?: number;
  transfer?: number;
  debt?: number;
  [key: string]: unknown;
}

export interface PatientLTVRecord {
  id: number;
  fullName: string;
  phone?: string;
  createdAt?: string;
  ltv: number;
  lastVisit?: string;
}

export interface CampaignRecord {
  id: number;
  name: string;
  type: string;
  targetGroup: string;
  content: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

export interface TransactionRecord {
  id: number;
  type: string;
  amount: number;
  paymentType?: string;
  patient_name?: string;
  description?: string;
  debt?: number;
  shift_id?: number;
  patientId?: number;
  appointmentId?: number;
  doctor_id?: number;
  patientNameStr?: string;
  patientPhone?: string;
  doctorNameStr?: string;
  serviceName?: string;
  shiftType?: string;
  activeRoom?: string;
  patientBalance?: number;
  createdAt?: string;
  [key: string]: unknown;
}

export interface RoomRecord {
  id: number;
  name: string;
  department?: string;
  floor?: number;
  capacity?: number;
  type?: string;
  pricePerDay?: number;
  mealPrice?: number;
  cleaningStatus?: string;
  [key: string]: unknown;
}

export interface RoomPatientRecord {
  id: number;
  patientId: number;
  roomId: number;
  patientName?: string;
  doctorName?: string;
  roomName?: string;
  tariffName?: string;
  age?: number | string;
  gender?: string;
  phone?: string;
  doctorId?: number;
  tariffId?: number;
  hasMeals?: boolean | number;
  dietType?: string;
  bedIndex?: string | number;
  deposit?: number;
  depositBalance?: number;
  notes?: string;
  arrivalTime?: string;
  entryDate?: string;
  status?: string;
  days?: number;
  tariffPrice?: number;
  defaultRoomPrice?: number;
  roomMealPrice?: number;
  temp?: string | number;
  lastBP?: string;
  pulse?: string | number;
  [key: string]: unknown;
}

export interface InpatientTreatmentRecord {
  id: number;
  patientId?: number;
  roomPatientId?: number;
  title: string;
  scheduledTime?: string;
  notes?: string;
  status?: string;
  createdAt?: string;
  isDone?: boolean | number;
  doneAt?: string;
  patientName?: string;
  roomName?: string;
  [key: string]: unknown;
}

export interface VitalsRecord {
  id: number;
  temperature?: number | string;
  bp?: string;
  pulse?: number | string;
  weight?: number | string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface DischargeInvoice {
  rp: RoomPatientRecord;
  days: number;
  roomPrice: number;
  roomTotal: number;
  mealPrice: number;
  mealTotal: number;
  additionalDebt: number;
  grandTotal: number;
  deposit: number;
  toPay: number;
}

export interface QueueReceiptData {
  type: 'queue';
  prefix?: string;
  number?: number | string;
  doctorName?: string;
  patientName?: string;
}

export interface ServiceReceiptData {
  type?: string;
  patientName?: string;
  doctorName?: string;
  services?: Array<{ name: string; price: number | string }>;
  discount?: number;
  total?: number;
  paymentType?: string;
}

export interface PayoutReceiptData {
  type: 'payout';
  amount?: number;
  doctorName?: string;
  specialty?: string;
  percentage?: number;
  revenue?: number;
  note?: string;
}

export type ReceiptData = QueueReceiptData | ServiceReceiptData | PayoutReceiptData;

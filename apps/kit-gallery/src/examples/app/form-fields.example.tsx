import { SendIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useT } from "@rcene/i18n";
import {
  BarangayField,
  CheckboxField,
  NumberField,
  RadioField,
  SelectField,
  TextareaField,
  TextField,
  useKitZodErrors,
} from "@rcene/kit/app";
import { toast } from "@rcene/ui";
import { Button } from "@rcene/ui/components/button";
import { Form } from "@rcene/ui/components/form";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "Form fields",
  summary: {
    en: "react-hook-form fields with the label, '(required)' in words, a hint, the control and an announced error; zod messages come translated from useKitZodErrors.",
    war: "Mga field han react-hook-form nga may label, '(kinahanglan)' ha pulong, hint, kontrol ngan error nga ginpapahibaro; an mga mensahe han zod hubad tikang ha useKitZodErrors.",
    fil: "Mga field ng react-hook-form na may label, '(kailangan)' sa salita, hint, kontrol at error na inaanunsyo; isinalin ang mga mensahe ng zod mula sa useKitZodErrors.",
  },
  blocks: ["TextField", "NumberField", "SelectField", "RadioField", "CheckboxField", "TextareaField", "BarangayField"],
  order: 50,
  frameHeight: 1180,
};

const strings = {
  en: {
    household: "Household code",
    householdHint: "On the household card, like HH-0042. No names.",
    householdFormat: "Use the code on the card, like HH-0042.",
    people: "People in the household",
    peopleUnit: "people",
    need: "Main need",
    water: "Drinking water",
    food: "Food packs",
    medical: "Medical check",
    barangay: "Barangay",
    stay: "Where are you staying tonight?",
    home: "At home",
    homeHint: "We bring packs to the house.",
    centre: "Evacuation centre",
    centreHint: "Pick it up at the centre's desk.",
    notes: "Notes for the team",
    notesHint: "Access, pets, medicine. Optional.",
    confirm: "I checked the code and the barangay",
    confirmNeeded: "Tick this box to confirm.",
    send: "Send request",
    sent: "Request for {code} sent (sample, nothing was saved).",
  },
  war: {
    household: "Code han panimalay",
    householdHint: "Aadi ha kard han panimalay, sugad han HH-0042. Waray ngaran.",
    householdFormat: "Gamita an code ha kard, sugad han HH-0042.",
    people: "Kadamo han tawo ha panimalay",
    peopleUnit: "ka tawo",
    need: "Panguna nga kinahanglan",
    water: "Tubig nga mainom",
    food: "Food packs",
    medical: "Medikal nga pagsusi",
    stay: "Diin ka mapapabilin yana nga gab-i?",
    home: "Ha balay",
    homeHint: "Dad-on namon an packs ha balay.",
    centre: "Evacuation center",
    centreHint: "Kuhaa ha desk han center.",
    notes: "Mga pahinumdom para ha team",
    notesHint: "Agian, hayop, bulong. Diri kinahanglan.",
    confirm: "Gin-check ko an code ngan an barangay",
    confirmNeeded: "I-tsek ini basi kumpirmahon.",
    send: "Ipadara an hangyo",
    sent: "Ginpadara an hangyo para ha {code} (sample, waray natipig).",
  },
  fil: {
    household: "Code ng sambahayan",
    householdHint: "Nasa kard ng sambahayan, gaya ng HH-0042. Walang pangalan.",
    householdFormat: "Gamitin ang code sa kard, gaya ng HH-0042.",
    people: "Bilang ng tao sa sambahayan",
    peopleUnit: "tao",
    need: "Pangunahing kailangan",
    water: "Inuming tubig",
    food: "Food packs",
    medical: "Medikal na pagsusuri",
    stay: "Saan ka mananatili ngayong gabi?",
    home: "Sa bahay",
    homeHint: "Dadalhin namin ang packs sa bahay.",
    centre: "Evacuation center",
    centreHint: "Kunin sa desk ng center.",
    notes: "Mga tala para sa team",
    notesHint: "Daan, alagang hayop, gamot. Hindi kailangan.",
    confirm: "Sinuri ko ang code at ang barangay",
    confirmNeeded: "Lagyan ng tsek para kumpirmahin.",
    send: "Ipadala ang kahilingan",
    sent: "Naipadala ang kahilingan para sa {code} (sample, walang na-save).",
  },
};

/** Barangay codes for the picker; an app passes the names from the barangays layer. */
const BARANGAYS = Array.from({ length: 57 }, (_, i) => `BRGY-${String(i + 1).padStart(2, "0")}`);

export function Example() {
  const t = useT(strings);
  const errors = useKitZodErrors();
  const schema = z.object({
    household: z
      .string()
      .min(1)
      .regex(/^HH-\d{4}$/, t("householdFormat")),
    people: z.int().min(1).max(30),
    need: z.enum(["water", "food", "medical"]),
    barangay: z.string().min(1),
    stay: z.enum(["home", "centre"]),
    notes: z.string().max(200),
    confirm: z.boolean().refine((v) => v, t("confirmNeeded")),
  });
  const form = useForm({
    resolver: zodResolver(schema, { error: errors.map }),
    defaultValues: { household: "", barangay: "", notes: "", confirm: false },
  });

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit((v) => toast.success(t("sent", { code: v.household })))}
        className="grid max-w-2xl gap-5 sm:grid-cols-2"
      >
        <TextField
          control={form.control}
          name="household"
          label={t("household")}
          description={t("householdHint")}
          autoComplete="off"
          required
          className="sm:col-span-2"
        />
        <NumberField control={form.control} name="people" label={t("people")} unit={t("peopleUnit")} min={1} max={30} required />
        <SelectField
          control={form.control}
          name="need"
          label={t("need")}
          required
          options={[
            { value: "water", label: t("water") },
            { value: "food", label: t("food") },
            { value: "medical", label: t("medical") },
          ]}
        />
        <BarangayField
          control={form.control}
          name="barangay"
          label={t("barangay")}
          barangays={BARANGAYS}
          required
          className="sm:col-span-2"
        />
        <RadioField
          control={form.control}
          name="stay"
          label={t("stay")}
          required
          className="sm:col-span-2"
          options={[
            { value: "home", label: t("home"), hint: t("homeHint") },
            { value: "centre", label: t("centre"), hint: t("centreHint") },
          ]}
        />
        <TextareaField
          control={form.control}
          name="notes"
          label={t("notes")}
          description={t("notesHint")}
          maxLength={200}
          rows={3}
          className="sm:col-span-2"
        />
        <CheckboxField control={form.control} name="confirm" label={t("confirm")} required className="sm:col-span-2" />
        <div className="sm:col-span-2">
          <Button type="submit" size="lg">
            <SendIcon aria-hidden="true" />
            {t("send")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

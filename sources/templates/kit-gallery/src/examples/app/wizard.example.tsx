import { useState } from "react";
import { RotateCcwIcon } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useT } from "@rcene/i18n";
import { BarangayField, CheckboxField, IllustratedState, NumberField, TextField, useKitZodErrors, useWizard, Wizard } from "@rcene/kit/app";
import { Button } from "@rcene/ui/components/button";
import { Form } from "@rcene/ui/components/form";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "Wizard",
  summary: {
    en: "A long form in short steps: a numbered stepper, focus on each new step's title, Back / Next / Finish, and Next that says why it waits.",
    war: "Halaba nga form ha mubo nga mga lakang: may numero nga stepper, focus ha titulo han kada bag-o nga lakang, Balik / Sunod / Tapusa, ngan Sunod nga nagsasaysay kun kay ano naghuhulat.",
    fil: "Mahabang form sa maiikling hakbang: may numerong stepper, focus sa pamagat ng bawat bagong hakbang, Bumalik / Susunod / Tapusin, at Susunod na nagsasabi kung bakit naghihintay.",
  },
  blocks: ["Wizard"],
  order: 60,
  frameHeight: 820,
};

const strings = {
  en: {
    household: "Household",
    householdLead: "Who the help is for. Codes only, no names.",
    place: "Place",
    placeLead: "Where the team should go.",
    review: "Review and send",
    reviewLead: "Check the details, then confirm.",
    code: "Household code",
    codeHint: "Like HH-0042, from the household card.",
    codeFormat: "Use the code on the card, like HH-0042.",
    people: "People",
    peopleHint: "Everyone who sleeps there, children too.",
    barangay: "Barangay",
    landmark: "Nearest landmark",
    landmarkHint: "A chapel, a school, a sari-sari store.",
    confirm: "The details are correct",
    blocked: "Tick the box above to send.",
    send: "Send request",
    doneTitle: "Request REC-0025 sent",
    doneLead: "Sample only: nothing was saved. The team sees it in the console.",
    again: "Start again",
  },
  war: {
    household: "Panimalay",
    householdLead: "Kanay an bulig. Code la, waray ngaran.",
    place: "Lugar",
    placeLead: "Diin makadto an team.",
    review: "Kitaa ngan ipadara",
    reviewLead: "Kitaa an mga detalye, dayon kumpirmaha.",
    code: "Code han panimalay",
    codeHint: "Sugad han HH-0042, tikang ha kard han panimalay.",
    people: "Mga tawo",
    peopleHint: "An ngatanan nga nakatulog didto, upod an mga bata.",
    landmark: "Pinakahirani nga landmark",
    landmarkHint: "Kapilya, eskwelahan, sari-sari store.",
    confirm: "Husto an mga detalye",
    blocked: "I-tsek an kahon ha ibabaw basi ipadara.",
    send: "Ipadara an hangyo",
    doneTitle: "Ginpadara an hangyo REC-0025",
    doneLead: "Sample la: waray natipig. Makikita ini han team ha console.",
    again: "Utroha",
  },
  fil: {
    household: "Sambahayan",
    householdLead: "Para kanino ang tulong. Code lang, walang pangalan.",
    place: "Lugar",
    placeLead: "Saan pupunta ang team.",
    review: "Suriin at ipadala",
    reviewLead: "Suriin ang mga detalye, saka kumpirmahin.",
    code: "Code ng sambahayan",
    codeHint: "Gaya ng HH-0042, mula sa kard ng sambahayan.",
    people: "Mga tao",
    peopleHint: "Lahat ng natutulog doon, kasama ang mga bata.",
    landmark: "Pinakamalapit na palatandaan",
    landmarkHint: "Kapilya, paaralan, sari-sari store.",
    confirm: "Tama ang mga detalye",
    blocked: "Lagyan ng tsek ang kahon sa itaas para maipadala.",
    send: "Ipadala ang kahilingan",
    doneTitle: "Naipadala ang kahilingang REC-0025",
    doneLead: "Sample lang: walang na-save. Makikita ito ng team sa console.",
    again: "Magsimula muli",
  },
};

const BARANGAYS = Array.from({ length: 57 }, (_, i) => `BRGY-${String(i + 1).padStart(2, "0")}`);

/** The fields each step checks before moving on. */
const STEP_FIELDS = [["code", "people"], ["barangay", "landmark"], ["confirm"]] as const;

export function Example() {
  const t = useT(strings);
  const errors = useKitZodErrors();
  const wizard = useWizard(3);
  const [sent, setSent] = useState(false);
  const schema = z.object({
    code: z
      .string()
      .min(1)
      .regex(/^HH-\d{4}$/, t("codeFormat")),
    people: z.int().min(1).max(30),
    barangay: z.string().min(1),
    landmark: z.string().min(3).max(80),
    confirm: z.boolean(),
  });
  const form = useForm({
    resolver: zodResolver(schema, { error: errors.map }),
    defaultValues: { code: "", barangay: "", landmark: "", confirm: false },
  });
  const confirmed = useWatch({ control: form.control, name: "confirm" });

  // Going forward checks the current step's fields first; going back never does.
  async function go(index: number) {
    if (index > wizard.current && !(await form.trigger([...STEP_FIELDS[wizard.current]!]))) return;
    wizard.goTo(index);
  }

  function restart() {
    form.reset();
    wizard.reset();
    setSent(false);
  }

  if (sent) {
    return (
      <IllustratedState
        spot="done"
        title={t("doneTitle")}
        description={t("doneLead")}
        actions={
          <Button variant="outline" onClick={restart}>
            <RotateCcwIcon aria-hidden="true" />
            {t("again")}
          </Button>
        }
      />
    );
  }

  const values = form.getValues();
  return (
    <Form {...form}>
      <form noValidate onSubmit={(e) => e.preventDefault()} className="max-w-2xl">
        <Wizard
          steps={[
            { id: "household", title: t("household"), description: t("householdLead") },
            { id: "place", title: t("place"), description: t("placeLead") },
            { id: "review", title: t("review"), description: t("reviewLead") },
          ]}
          current={wizard.current}
          onStepChange={(i) => void go(i)}
          canNext={wizard.isLast ? confirmed : true}
          blockedReason={t("blocked")}
          finishLabel={t("send")}
          onFinish={() => void form.handleSubmit(() => setSent(true))()}
        >
          {wizard.current === 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField control={form.control} name="code" label={t("code")} description={t("codeHint")} required />
              <NumberField
                control={form.control}
                name="people"
                label={t("people")}
                description={t("peopleHint")}
                min={1}
                max={30}
                required
              />
            </div>
          )}
          {wizard.current === 1 && (
            <div className="grid gap-5">
              <BarangayField control={form.control} name="barangay" label={t("barangay")} barangays={BARANGAYS} required />
              <TextField control={form.control} name="landmark" label={t("landmark")} description={t("landmarkHint")} required />
            </div>
          )}
          {wizard.current === 2 && (
            <div className="grid gap-5">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-lg bg-muted/60 p-4 text-sm">
                <dt className="text-muted-foreground">{t("code")}</dt>
                <dd className="font-mono font-semibold">{values.code}</dd>
                <dt className="text-muted-foreground">{t("people")}</dt>
                <dd className="tabular-nums">{values.people}</dd>
                <dt className="text-muted-foreground">{t("barangay")}</dt>
                <dd>{values.barangay}</dd>
                <dt className="text-muted-foreground">{t("landmark")}</dt>
                <dd>{values.landmark}</dd>
              </dl>
              <CheckboxField control={form.control} name="confirm" label={t("confirm")} required />
            </div>
          )}
        </Wizard>
      </form>
    </Form>
  );
}

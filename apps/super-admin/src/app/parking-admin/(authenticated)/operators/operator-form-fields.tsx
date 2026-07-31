import { Input } from "@/components/ui/input";
import { Field } from "../../components/field";
import { PhotoInput } from "../../components/photo-input";
import { DocumentInput } from "./document-input";
import { DlDocumentInput } from "./dl-document-input";

export function OperatorFormFields({
  defaultValues,
  passwordPlaceholder,
}: {
  defaultValues?: {
    username?: string;
    full_name?: string | null;
    employee_id?: string | null;
    email?: string | null;
    phone?: string | null;
    driving_license_expiry?: string | null;
  };
  passwordPlaceholder?: string;
}) {
  return (
    <>
      <Field label="Username">
        <Input name="username" required defaultValue={defaultValues?.username} />
      </Field>
      <Field label={passwordPlaceholder ? "New password" : "Password"}>
        <Input
          name="password"
          type="password"
          required={!passwordPlaceholder}
          placeholder={passwordPlaceholder}
        />
      </Field>
      <Field label="Full name">
        <Input name="full_name" defaultValue={defaultValues?.full_name ?? ""} />
      </Field>
      <Field label="Employee ID">
        <Input name="employee_id" defaultValue={defaultValues?.employee_id ?? ""} />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" defaultValue={defaultValues?.email ?? ""} />
      </Field>
      <Field label="Phone">
        <Input name="phone" type="tel" defaultValue={defaultValues?.phone ?? ""} />
      </Field>
      <PhotoInput name="photo" label="Photo" />
      <DlDocumentInput defaultExpiry={defaultValues?.driving_license_expiry} />
      <PhotoInput name="aadhar" label="Aadhar Card" />
      <DocumentInput name="police_verification" label="Police Verification (optional)" required={false} />
    </>
  );
}

<script lang="ts">
  import {
    BriefcaseBusiness,
    Building2,
    CalendarDays,
    CircleDollarSign,
    CircleHelp,
    ClipboardList,
    FileText,
    FolderKanban,
    GraduationCap,
    Headphones,
    Settings,
    UserRoundCog,
    Users,
  } from "lucide-svelte";
  import { normalizeHelpCategoryIcon } from "$lib/help/helpCategoryConstants";

  export let name = "FolderKanban";
  export let size = 18;
  export let className = "";

  $: icon = normalizeHelpCategoryIcon(name);
</script>

{#if icon === "Users"}
  <Users {size} class={className}/>
{:else if icon === "UserRoundCog"}
  <UserRoundCog {size} class={className}/>
{:else if icon === "Building2"}
  <Building2 {size} class={className}/>
{:else if icon === "BriefcaseBusiness"}
  <BriefcaseBusiness {size} class={className}/>
{:else if icon === "CircleDollarSign"}
  <CircleDollarSign {size} class={className}/>
{:else if icon === "GraduationCap"}
  <GraduationCap {size} class={className}/>
{:else if icon === "CalendarDays"}
  <CalendarDays {size} class={className}/>
{:else if icon === "ClipboardList"}
  <ClipboardList {size} class={className}/>
{:else if icon === "FileText"}
  <FileText {size} class={className}/>
{:else if icon === "Settings"}
  <Settings {size} class={className}/>
{:else if icon === "Headphones"}
  <Headphones {size} class={className}/>
{:else if icon === "CircleHelp"}
  <CircleHelp {size} class={className}/>
{:else}
  <FolderKanban {size} class={className}/>
{/if}

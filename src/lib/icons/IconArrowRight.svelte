<script lang="ts">
    export let size: number = 20;
    export let classType: string = "";
    export let stroke: string = "white";
</script>

<svg
    class={classType}
    width={size}
    height={(size * 15) / 20}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
>
    <path
        d="M5 12H19"
        stroke={stroke}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
    />
    <path
        d="M12 5L19 12L12 19"
        stroke={stroke}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
    />
</svg>

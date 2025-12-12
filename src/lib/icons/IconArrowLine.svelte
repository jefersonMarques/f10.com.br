<script lang="ts">
    export let size: number = 20;
    export let classType: string = "";
    export let color: string = "";
    export let stroke: string = "2";
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width={stroke}
    width={size}
    height={(size * 15) / 20}
    class={classType}
    aria-hidden="true"
    stroke={color}
    ><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"
    ></path>
</svg>
